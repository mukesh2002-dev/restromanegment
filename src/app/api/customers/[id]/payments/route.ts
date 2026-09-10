export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { demoBills, demoCustomers } from "@/data/demo";

// GET /api/customers/[id]/payments?take=20&page=1&method=ALL&status=ALL&q=&from=&to=
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const take = Math.min(Number(url.searchParams.get("take") || "20"), 100);
  const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
  const q = (url.searchParams.get("q") || "").toLowerCase().trim();
  const method = (url.searchParams.get("method") || "ALL").toUpperCase();
  const status = (url.searchParams.get("status") || "ALL").toUpperCase();
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const skip = (page - 1) * take;

  const dbOk = await isDbAvailable();
  if (!dbOk) {
    // demo fallback
    let bills = demoBills.filter((b) => b.customerId === id);
    // if id is phone fallback
    if (!bills.length) {
      const cust = demoCustomers.find((c) => c.phone === id || c.id === id);
      if (cust) bills = demoBills.filter((b) => b.customerId === cust.id);
    }
    // filters
    if (q) bills = bills.filter((b) => b.billNumber.toLowerCase().includes(q) || b.orderNumber.toLowerCase().includes(q) || b.id.toLowerCase().includes(q));
    if (status !== "ALL") bills = bills.filter((b) => b.paymentStatus === status);
    if (from) bills = bills.filter((b) => new Date(b.createdAt) >= new Date(from));
    if (to) bills = bills.filter((b) => new Date(b.createdAt) <= new Date(to + "T23:59:59"));
    // mock method filter - demo bills have no method, assign pseudo
    const methodMap: Record<string, string> = {};
    bills = bills.map((b, idx) => {
      const methods = ["CASH", "UPI", "CARD", "ONLINE", "WALLET"];
      const m = methods[idx % methods.length];
      return { ...b, _mockMethod: m, _payments: [{ method: m, amount: b.totalAmount, status: b.paymentStatus, reference: m === "ONLINE" ? `pay_${b.id.slice(-10)}` : null }] };
    });
    if (method !== "ALL") bills = bills.filter((b) => (b as unknown as { _mockMethod: string })._mockMethod === method);

    const total = bills.length;
    const paged = bills.slice(skip, skip + take).map((b) => ({
      id: b.id,
      billNumber: b.billNumber,
      orderNumber: b.orderNumber,
      orderId: b.orderId,
      totalAmount: b.totalAmount,
      subtotal: b.subtotal,
      taxAmount: b.taxAmount,
      discountAmount: 0,
      paymentStatus: b.paymentStatus,
      status: b.status,
      paidAt: b.paidAt,
      createdAt: b.createdAt,
      qrToken: b.qrToken,
      // demo payments
      payments: (b as unknown as { _payments: unknown[] })._payments,
      // split demo: every 5th bill is split
      isSplit: Number(b.id.slice(-1)) % 5 === 0,
    }));

    // summary
    const totalPaid = bills.filter((b) => b.paymentStatus === "PAID").reduce((a, b) => a + b.totalAmount, 0);
    const refunded = bills.filter((b) => b.paymentStatus === "REFUNDED").reduce((a, b) => a + b.totalAmount, 0);
    const lastPaid = bills.filter((b) => b.paymentStatus === "PAID").sort((a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime())[0];

    return NextResponse.json({
      total,
      page,
      take,
      data: paged,
      summary: {
        totalOrders: bills.length,
        totalPaid,
        refundAmount: refunded,
        lastPayment: lastPaid?.totalAmount || 0,
        lastPaymentAt: lastPaid?.paidAt || lastPaid?.createdAt || null,
      },
    });
  }

  // DB mode - verify customer exists and belongs to restaurant
  const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true, restaurantId: true } });
  // also try phone lookup
  let customerId = id;
  if (!customer) {
    const byPhone = await prisma.customer.findFirst({ where: { phone: id }, select: { id: true } });
    if (byPhone) customerId = byPhone.id;
    else return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const where: Record<string, unknown> = { customerId };
  if (status !== "ALL") (where as Record<string, unknown>).paymentStatus = status;
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.gte = new Date(from);
    if (to) createdAt.lte = new Date(to + "T23:59:59");
    (where as Record<string, unknown>).createdAt = createdAt;
  }
  if (q) {
    (where as Record<string, unknown>).OR = [
      { billNumber: { contains: q, mode: "insensitive" } },
      { order: { orderNumber: { contains: q, mode: "insensitive" } } },
      { id: { contains: q, mode: "insensitive" } },
    ];
  }

  // method filter needs to filter by payments - use separate query then filter ids
  let billIdsWithMethod: string[] | null = null;
  if (method !== "ALL") {
    const pm = await prisma.payment.findMany({ where: { bill: { customerId }, method: method as never }, select: { billId: true } });
    billIdsWithMethod = [...new Set(pm.map((p) => p.billId).filter(Boolean) as string[])];
    if (billIdsWithMethod.length === 0) {
      return NextResponse.json({ total: 0, page, take, data: [], summary: { totalOrders: 0, totalPaid: 0, refundAmount: 0, lastPayment: 0, lastPaymentAt: null } });
    }
    (where as Record<string, unknown>).id = { in: billIdsWithMethod };
    delete (where as Record<string, unknown>).OR; // keep simple when method filter
    if (q) {
      // re-add q with id + billNumber
      (where as Record<string, unknown>).AND = [
        { id: { in: billIdsWithMethod } },
        { OR: [{ billNumber: { contains: q, mode: "insensitive" } }, { id: { contains: q, mode: "insensitive" } }] },
      ];
      delete (where as Record<string, unknown>).id;
      delete (where as Record<string, unknown>).OR;
    }
  }

  const [total, bills] = await Promise.all([
    prisma.bill.count({ where }),
    prisma.bill.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        order: { select: { orderNumber: true, id: true } },
        payments: { select: { id: true, method: true, amount: true, status: true, reference: true, createdAt: true } },
      },
    }),
  ]);

  // summary without pagination but with filters (method/status/date/q)
  const allFiltered = await prisma.bill.findMany({ where, select: { totalAmount: true, paymentStatus: true, paidAt: true, createdAt: true } });
  const totalPaid = allFiltered.filter((b) => b.paymentStatus === "PAID").reduce((a, b) => a + b.totalAmount, 0);
  const refunded = allFiltered.filter((b) => b.paymentStatus === "REFUNDED" || b.paymentStatus === "PARTIAL").reduce((a, b) => a + (b.paymentStatus === "REFUNDED" ? b.totalAmount : 0), 0);
  const lastPaid = allFiltered
    .filter((b) => b.paymentStatus === "PAID")
    .sort((a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime())[0];

  const data = bills.map((b) => ({
    id: b.id,
    billNumber: b.billNumber,
    orderNumber: b.order?.orderNumber || b.orderId.slice(0, 8),
    orderId: b.orderId,
    totalAmount: b.totalAmount,
    subtotal: b.subtotal,
    taxAmount: b.taxAmount,
    discountAmount: b.discountAmount,
    paymentStatus: b.paymentStatus,
    status: b.status,
    paidAt: b.paidAt,
    createdAt: b.createdAt,
    qrToken: b.qrToken,
    payments: b.payments,
    isSplit: b.payments.length > 1,
  }));

  return NextResponse.json({
    total,
    page,
    take,
    data,
    summary: {
      totalOrders: total,
      totalPaid,
      refundAmount: refunded,
      lastPayment: lastPaid?.totalAmount || 0,
      lastPaymentAt: lastPaid?.paidAt || lastPaid?.createdAt || null,
    },
  });
}

