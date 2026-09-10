export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma, getEffectiveRestaurantId } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { demoBills, demoCustomers } from "@/data/demo";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // RBAC: OWNER/MANAGER full, CASHIER limited to own? For now allow all with viewing
  if (!["OWNER", "MANAGER", "CASHIER"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const take = Math.min(Number(url.searchParams.get("take") || "20"), 100);
  const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
  const q = (url.searchParams.get("q") || "").toLowerCase().trim();
  const method = (url.searchParams.get("method") || "ALL").toUpperCase();
  const status = (url.searchParams.get("status") || "ALL").toUpperCase();
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const minAmount = Number(url.searchParams.get("minAmount") || "0");
  const maxAmount = url.searchParams.get("maxAmount") ? Number(url.searchParams.get("maxAmount")) : null;
  const skip = (page - 1) * take;

  const dbOk = await isDbAvailable();
  if (!dbOk) {
    let bills = [...demoBills];
    if (q) bills = bills.filter((b) => b.billNumber.toLowerCase().includes(q) || b.orderNumber.toLowerCase().includes(q) || b.customerId.toLowerCase().includes(q));
    if (status !== "ALL") bills = bills.filter((b) => b.paymentStatus === status);
    if (from) bills = bills.filter((b) => new Date(b.createdAt) >= new Date(from));
    if (to) bills = bills.filter((b) => new Date(b.createdAt) <= new Date(to + "T23:59:59"));
    if (minAmount) bills = bills.filter((b) => b.totalAmount >= minAmount);
    if (maxAmount) bills = bills.filter((b) => b.totalAmount <= maxAmount!);
    // pseudo method
    bills = bills.map((b, idx) => {
      const methods = ["CASH", "UPI", "CARD", "ONLINE", "WALLET"];
      return { ...b, _mockMethod: methods[idx % methods.length], _payments: [{ method: methods[idx % methods.length], amount: b.totalAmount, status: b.paymentStatus }] };
    });
    if (method !== "ALL") bills = bills.filter((b) => (b as unknown as { _mockMethod: string })._mockMethod === method);
    const total = bills.length;
    const paged = bills.slice(skip, skip + take).map((b) => {
      const cust = demoCustomers.find((c) => c.id === b.customerId);
      return {
        id: b.id,
        billNumber: b.billNumber,
        orderNumber: b.orderNumber,
        customerId: b.customerId,
        customerName: cust?.name || "Walk-in",
        customerPhone: cust?.phone || "â€”",
        totalAmount: b.totalAmount,
        paymentStatus: b.paymentStatus,
        status: b.status,
        paidAt: b.paidAt,
        createdAt: b.createdAt,
        payments: (b as unknown as { _payments: unknown[] })._payments,
        isSplit: false,
      };
    });
    // summary
    const totalAmount = bills.reduce((a, b) => a + b.totalAmount, 0);
    const byMethod: Record<string, { count: number; amount: number }> = {};
    bills.forEach((b) => {
      const m = (b as unknown as { _mockMethod: string })._mockMethod;
      if (!byMethod[m]) byMethod[m] = { count: 0, amount: 0 };
      byMethod[m].count += 1;
      byMethod[m].amount += b.totalAmount;
    });
    return NextResponse.json({
      total,
      page,
      take,
      data: paged,
      summary: {
        totalAmount,
        totalBills: bills.length,
        byMethod: Object.entries(byMethod).map(([method, v]) => ({ method, ...v })),
      },
    });
  }

  const effectiveRid = (await getEffectiveRestaurantId(session.restaurantId)) || session.restaurantId;
  const where: Record<string, unknown> = { restaurantId: effectiveRid };
  if (status !== "ALL") (where as Record<string, unknown>).paymentStatus = status;
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.gte = new Date(from);
    if (to) createdAt.lte = new Date(to + "T23:59:59");
    (where as Record<string, unknown>).createdAt = createdAt;
  }
  if (minAmount || maxAmount) {
    const totalAmount: Record<string, number> = {};
    if (minAmount) totalAmount.gte = minAmount;
    if (maxAmount) totalAmount.lte = maxAmount;
    (where as Record<string, unknown>).totalAmount = totalAmount;
  }
  if (q) {
    (where as Record<string, unknown>).OR = [
      { billNumber: { contains: q, mode: "insensitive" } },
      { order: { orderNumber: { contains: q, mode: "insensitive" } } },
      { customer: { phone: { contains: q } } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  // method filter via payments
  if (method !== "ALL") {
    const pm = await prisma.payment.findMany({ where: { method: method as never, bill: { restaurantId: effectiveRid } }, select: { billId: true } });
    const ids = [...new Set(pm.map((p) => p.billId).filter(Boolean) as string[])];
    if (ids.length === 0) {
      return NextResponse.json({
        total: 0,
        page,
        take,
        data: [],
        summary: { totalAmount: 0, totalBills: 0, byMethod: [] },
      });
    }
    (where as Record<string, unknown>).id = { in: ids };
    // remove OR to avoid conflict, keep simple
    if (q) delete (where as Record<string, unknown>).OR;
  }

  const [total, bills] = await Promise.all([
    prisma.bill.count({ where }),
    prisma.bill.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        customer: { select: { name: true, phone: true } },
        order: { select: { orderNumber: true } },
        payments: { select: { method: true, amount: true, status: true, reference: true } },
      },
    }),
  ]);

  // summary for filtered set (without pagination)
  const allFiltered = await prisma.bill.findMany({ where, select: { totalAmount: true, paymentStatus: true } });
  const totalAmount = allFiltered.reduce((a, b) => a + b.totalAmount, 0);
  const paymentsForSummary = await prisma.payment.findMany({ where: { billId: { in: bills.map((b) => b.id) } }, select: { method: true, amount: true } });
  // better: aggregate by method across all filtered bills (limit 1000)
  const allBillIds = (await prisma.bill.findMany({ where, select: { id: true }, take: 1000 })).map((b) => b.id);
  const allPayments = await prisma.payment.findMany({ where: { billId: { in: allBillIds } }, select: { method: true, amount: true } });
  const byMethodMap: Record<string, { count: number; amount: number }> = {};
  allPayments.forEach((p) => {
    if (!byMethodMap[p.method]) byMethodMap[p.method] = { count: 0, amount: 0 };
    byMethodMap[p.method].count += 1;
    byMethodMap[p.method].amount += p.amount;
  });

  const data = bills.map((b) => ({
    id: b.id,
    billNumber: b.billNumber,
    orderNumber: b.order?.orderNumber || b.orderId.slice(0, 8),
    customerId: b.customerId,
    customerName: b.customer?.name || "Walk-in",
    customerPhone: b.customer?.phone || "â€”",
    totalAmount: b.totalAmount,
    subtotal: b.subtotal,
    taxAmount: b.taxAmount,
    paymentStatus: b.paymentStatus,
    status: b.status,
    paidAt: b.paidAt,
    createdAt: b.createdAt,
    payments: b.payments,
    isSplit: b.payments.length > 1,
  }));

  return NextResponse.json({
    total,
    page,
    take,
    data,
    summary: {
      totalAmount,
      totalBills: total,
      byMethod: Object.entries(byMethodMap).map(([method, v]) => ({ method, ...v })),
    },
  });
}

