export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, isDbAvailable, getEffectiveRestaurantId } from "@/lib/db";
import { billCreateSchema } from "@/lib/validators";
import { billStore } from "@/lib/bill-store";
import { randomBytes } from "crypto";

function genBillNumber(){ return `BILL-2026-${String(Date.now()).slice(-7)}${String(Math.floor(Math.random()*900+100))}`; }
function genQrToken(){ return `qr_bill_${Date.now()}_${randomBytes(4).toString("hex")}`; }

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit")||"20");
  const dbOk = await isDbAvailable();
  if (!dbOk) return NextResponse.json(billStore.list(Math.min(limit,100)));
  const session = await getSession();
  const bills = await prisma.bill.findMany({ where:{ restaurantId: session?.restaurantId || undefined }, orderBy:{ createdAt:"desc" }, take: Math.min(limit,100), include:{ order:true, payments:true } });
  return NextResponse.json(bills);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const body = await req.json().catch(()=>null);
  const parsed = billCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten() }, { status:400 });
  const { orderId, discountAmount, couponCode, loyaltyPointsToRedeem, payments } = parsed.data;

  const dbOk = await isDbAvailable();
  if (!dbOk) {
    // demo: simulate bill creation immutably and persist for verify
    const billNumber = genBillNumber();
    const qrToken = genQrToken();
    const sumPaid = payments.reduce((a,p)=>a+p.amount,0);
    const bill = {
      id: `bill_${Date.now()}`,
      billNumber,
      orderId,
      orderNumber: `ORD-2026-demo`,
      restaurantId: session.restaurantId,
      status: "PAID",
      paymentStatus: "PAID",
      subtotal: Math.round(sumPaid/1.05),
      taxAmount: sumPaid - Math.round(sumPaid/1.05),
      discountAmount: discountAmount||0,
      couponDiscount: 0,
      totalAmount: sumPaid,
      paidAt: new Date().toISOString(),
      qrToken,
      createdAt: new Date().toISOString(),
      payments: payments.map(p=> ({ ...p, status:"PAID", createdAt: new Date().toISOString() })),
    } as unknown as ReturnType<typeof billStore.get> & { payments: unknown[] };
    billStore.add(bill as never);
    return NextResponse.json(bill, { status:201 });
  }

  const order = await prisma.order.findUnique({ where:{ id: orderId }, include:{ bill:true } });
  if (!order) return NextResponse.json({ error:"Order not found" }, { status:404 });
  if (order.bill) return NextResponse.json({ error:"Bill already exists for this order", existing: order.bill }, { status:409 });
  const effectiveRid = await getEffectiveRestaurantId(session.restaurantId);
  if (order.restaurantId !== effectiveRid) return NextResponse.json({ error:"Order belongs to different restaurant" }, { status:403 });

  // server recomputes totals â€” never trust client total (Â§13)
  const subtotal = order.subtotal;
  const taxAmount = order.taxAmount;
  const discount = discountAmount ?? order.discountAmount;

  // â”€â”€ Coupon validation server-side (Â§25-26, Â§52) â”€â”€
  let couponDiscount = 0;
  let couponRecord: unknown = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where:{ code: couponCode.trim().toUpperCase() } });
    if (!coupon) return NextResponse.json({ error:`Coupon ${couponCode} not found`, code:"COUPON_NOT_FOUND" }, { status:404 });
    if (coupon.status !== "ACTIVE") return NextResponse.json({ error:`Coupon ${coupon.code} is ${coupon.status}`, code:"COUPON_INVALID" }, { status:400 });
    if (coupon.expiryDate < new Date()) return NextResponse.json({ error:"Coupon expired", code:"COUPON_EXPIRED" }, { status:400 });
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return NextResponse.json({ error:"Coupon usage limit reached", code:"COUPON_LIMIT" }, { status:400 });
    // ownership check â€” if coupon has customerId, only that customer can use (Â§25)
    if (coupon.customerId && order.customerId && coupon.customerId !== order.customerId) return NextResponse.json({ error:"Coupon does not belong to this customer", code:"COUPON_OWNERSHIP" }, { status:403 });
    const preCouponTotal = subtotal + taxAmount - discount;
    if (preCouponTotal < coupon.minSpend) return NextResponse.json({ error:`Minimum order â‚¹${coupon.minSpend} required for this coupon`, code:"COUPON_MIN_SPEND" }, { status:400 });
    if (coupon.rewardType === "PERCENTAGE") {
      couponDiscount = Math.round(preCouponTotal * Number(coupon.value) / 100);
      if (coupon.maxDiscount) couponDiscount = Math.min(couponDiscount, Number(coupon.maxDiscount));
    } else if (coupon.rewardType === "FIXED") {
      couponDiscount = Number(coupon.value);
    }
    couponDiscount = Math.min(couponDiscount, preCouponTotal);
    couponRecord = coupon as unknown;
  }

  // â”€â”€ Loyalty redemption validation (Â§25) â”€â”€
  let loyaltyDiscount = 0;
  if (loyaltyPointsToRedeem && loyaltyPointsToRedeem > 0) {
    if (!order.customerId) return NextResponse.json({ error:"Walk-in cannot redeem loyalty points (Â§6)", code:"LOYALTY_WALKIN" }, { status:400 });
    if (order.customerId && couponRecord && (couponRecord as { customerId: string|null })?.customerId && (couponRecord as { customerId: string|null }).customerId !== order.customerId) {
      // already checked
    }
    const cust = await prisma.customer.findUnique({ where:{ id: order.customerId } });
    if (!cust) return NextResponse.json({ error:"Customer not found for loyalty" }, { status:404 });
    if (cust.loyaltyPoints < loyaltyPointsToRedeem) return NextResponse.json({ error:`Insufficient points â€” available ${cust.loyaltyPoints}`, code:"INSUFFICIENT_POINTS" }, { status:400 });
    // 1 pt = â‚¹1 discount (Â§24 points per â‚¹100 configurable but redeem 1:1 for now)
    loyaltyDiscount = loyaltyPointsToRedeem;
  }

  const totalAmount = Math.max(0, subtotal + taxAmount - discount - couponDiscount - loyaltyDiscount);

  const sumPayments = payments.reduce((a,p)=>a+p.amount,0);
  if (sumPayments < totalAmount - 0.01) {
    return NextResponse.json({ error:`Payments sum â‚¹${sumPayments} less than bill total â‚¹${totalAmount}`, code:"PAYMENT_SHORT" }, { status:400 });
  }
  const eligibleToMarkPaid = sumPayments >= totalAmount - 0.01;

  const billNumber = genBillNumber();
  const qrToken = genQrToken();

  const effectiveRestaurantId = await getEffectiveRestaurantId(session.restaurantId);
  // Pooled DB (Neon pgbouncer) does NOT support interactive transactions (P2028 Transaction not found)
  // Use sequential non-transactional creates to avoid Transaction API error on Vercel
  let bill;
  let loyaltyEarned = 0;
  let loyaltyBalanceAfter: number | null = null;
  try {
    const b = await prisma.bill.create({
      data:{
        restaurantId: effectiveRestaurantId!,
        billNumber,
        orderId: order.id,
        customerId: order.customerId,
        status: eligibleToMarkPaid ? "PAID" : "UNPAID",
        paymentStatus: eligibleToMarkPaid ? "PAID" : "PENDING",
        subtotal, taxAmount, discountAmount: discount + couponDiscount + loyaltyDiscount, totalAmount,
        paidAt: eligibleToMarkPaid ? new Date() : null,
        qrToken,
      },
    });
    // payments
    for (const p of payments) {
      await prisma.payment.create({ data:{ billId: b.id, orderId: order.id, method: p.method as never, amount: p.amount, status: eligibleToMarkPaid ? "PAID" : "PENDING", reference: p.reference } }).catch(()=>null);
    }
    await prisma.order.update({ where:{ id: order.id }, data:{ status: eligibleToMarkPaid ? "COMPLETED" : "PLACED", discountAmount: discount + couponDiscount + loyaltyDiscount, totalAmount } }).catch(()=>null);
    // coupon
    if (couponRecord) {
      const cr = couponRecord as { id: string };
      await prisma.coupon.update({ where:{ id: cr.id }, data:{ status:"REDEEMED", redeemedAt: new Date(), usedCount:{ increment:1 } } }).catch(()=>null);
      await prisma.couponRedemption.create({ data:{ couponId: cr.id, customerId: order.customerId||undefined, billId: b.id, discount: couponDiscount } }).catch(()=>null);
    }
    // loyalty redeem
    if (loyaltyDiscount>0 && order.customerId) {
      const cust = await prisma.customer.findUnique({ where:{ id: order.customerId } });
      const balAfter = (cust?.loyaltyPoints||0) - loyaltyDiscount;
      await prisma.loyaltyTransaction.create({ data:{ customerId: order.customerId, billId: b.id, type:"REDEEM", points: -loyaltyDiscount, balanceAfter: Math.max(0, balAfter), reason:`Redeem at bill ${b.billNumber}` } }).catch(()=>null);
      await prisma.customer.update({ where:{ id: order.customerId }, data:{ loyaltyPoints: Math.max(0, balAfter) } }).catch(()=>null);
      await prisma.loyaltyAccount.updateMany({ where:{ customerId: order.customerId }, data:{ points: Math.max(0, balAfter) } }).catch(()=>null);
    }
    // loyalty earn + visits
    if (eligibleToMarkPaid && order.customerId) {
      await prisma.customer.update({ where:{ id: order.customerId }, data:{ totalVisits:{ increment:1 }, totalSpend:{ increment: totalAmount } } }).catch(()=>null);
      const earnMinPurchase = 100;
      const pointsPer100 = 10;
      if (totalAmount >= earnMinPurchase) {
        const businessDate = new Date(); businessDate.setHours(0,0,0,0);
        const existingToday = await prisma.loyaltyTransaction.count({ where:{ customerId: order.customerId, type:"EARN", createdAt:{ gte: businessDate } } }).catch(()=>0);
        if (existingToday < 10) {
          const earnPoints = Math.floor(totalAmount / 100) * pointsPer100;
          if (earnPoints>0) {
            const c2 = await prisma.customer.findUnique({ where:{ id: order.customerId } });
            const bal = (c2?.loyaltyPoints||0) + earnPoints;
            await prisma.loyaltyTransaction.create({ data:{ customerId: order.customerId, billId: b.id, type:"EARN", points: earnPoints, balanceAfter: bal, reason:`Earn bill ${b.billNumber} â‚¹${totalAmount}` } }).catch(()=>null);
            await prisma.customer.update({ where:{ id: order.customerId }, data:{ loyaltyPoints: bal } }).catch(()=>null);
            await prisma.loyaltyAccount.upsert({ where:{ customerId: order.customerId }, create:{ customerId: order.customerId, points: earnPoints }, update:{ points: bal } }).catch(()=>null);
            loyaltyEarned = earnPoints;
            loyaltyBalanceAfter = bal;
          }
        }
      }
      (b as unknown as Record<string,unknown>).loyaltyEarned = loyaltyEarned;
      (b as unknown as Record<string,unknown>).loyaltyBalanceAfter = loyaltyBalanceAfter;
    }
    await prisma.table.updateMany({ where:{ id: order.tableId || undefined }, data:{ status:"AVAILABLE" } }).catch(()=>null);
    // audit outside transaction (pooled DB can't have audit inside tx - causes P2028 Transaction not found)
    await prisma.auditLog.create({ data:{ staffId: session.staffId, action:"CREATE_BILL", entity:"Bill", entityId: b.id, details:{ orderId: order.id, totalAmount, paymentStatus: eligibleToMarkPaid?"PAID":"PENDING", couponDiscount, loyaltyDiscount } as any } }).catch(()=>null);
    bill = b;
    (bill as unknown as Record<string,unknown>).loyaltyEarned = loyaltyEarned;
    (bill as unknown as Record<string,unknown>).loyaltyBalanceAfter = loyaltyBalanceAfter;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Bill create failed", { msg, code: (e as any)?.code, meta: (e as any)?.meta, orderId });
    return NextResponse.json({ error: `Bill create failed: ${msg}`, code: (e as any)?.code || "BILL_FAILED", details: String((e as any)?.meta || "") }, { status:500 });
  }

  // fetch with payments + attach loyalty info
  const full = await prisma.bill.findUnique({ where:{ id: bill.id }, include:{ payments:true, order:true } });
  const enriched = {
    ...full,
    loyaltyEarned: (bill as unknown as {loyaltyEarned?:number}).loyaltyEarned || 0,
    loyaltyBalanceAfter: (bill as unknown as {loyaltyBalanceAfter?:number}).loyaltyBalanceAfter || null,
  };
  return NextResponse.json(enriched, { status:201 });
}

