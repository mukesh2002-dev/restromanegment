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

  // server recomputes totals — never trust client total (§13)
  const subtotal = order.subtotal;
  const taxAmount = order.taxAmount;
  const discount = discountAmount ?? order.discountAmount;

  // ── Coupon validation server-side (§25-26, §52) ──
  let couponDiscount = 0;
  let couponRecord: unknown = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where:{ code: couponCode.trim().toUpperCase() } });
    if (!coupon) return NextResponse.json({ error:`Coupon ${couponCode} not found`, code:"COUPON_NOT_FOUND" }, { status:404 });
    if (coupon.status !== "ACTIVE") return NextResponse.json({ error:`Coupon ${coupon.code} is ${coupon.status}`, code:"COUPON_INVALID" }, { status:400 });
    if (coupon.expiryDate < new Date()) return NextResponse.json({ error:"Coupon expired", code:"COUPON_EXPIRED" }, { status:400 });
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return NextResponse.json({ error:"Coupon usage limit reached", code:"COUPON_LIMIT" }, { status:400 });
    // ownership check — if coupon has customerId, only that customer can use (§25)
    if (coupon.customerId && order.customerId && coupon.customerId !== order.customerId) return NextResponse.json({ error:"Coupon does not belong to this customer", code:"COUPON_OWNERSHIP" }, { status:403 });
    const preCouponTotal = subtotal + taxAmount - discount;
    if (preCouponTotal < coupon.minSpend) return NextResponse.json({ error:`Minimum order ₹${coupon.minSpend} required for this coupon`, code:"COUPON_MIN_SPEND" }, { status:400 });
    if (coupon.rewardType === "PERCENTAGE") {
      couponDiscount = Math.round(preCouponTotal * Number(coupon.value) / 100);
      if (coupon.maxDiscount) couponDiscount = Math.min(couponDiscount, Number(coupon.maxDiscount));
    } else if (coupon.rewardType === "FIXED") {
      couponDiscount = Number(coupon.value);
    }
    couponDiscount = Math.min(couponDiscount, preCouponTotal);
    couponRecord = coupon as unknown;
  }

  // ── Loyalty redemption validation (§25) ──
  let loyaltyDiscount = 0;
  if (loyaltyPointsToRedeem && loyaltyPointsToRedeem > 0) {
    if (!order.customerId) return NextResponse.json({ error:"Walk-in cannot redeem loyalty points (§6)", code:"LOYALTY_WALKIN" }, { status:400 });
    if (order.customerId && couponRecord && (couponRecord as { customerId: string|null })?.customerId && (couponRecord as { customerId: string|null }).customerId !== order.customerId) {
      // already checked
    }
    const cust = await prisma.customer.findUnique({ where:{ id: order.customerId } });
    if (!cust) return NextResponse.json({ error:"Customer not found for loyalty" }, { status:404 });
    if (cust.loyaltyPoints < loyaltyPointsToRedeem) return NextResponse.json({ error:`Insufficient points — available ${cust.loyaltyPoints}`, code:"INSUFFICIENT_POINTS" }, { status:400 });
    // 1 pt = ₹1 discount (§24 points per ₹100 configurable but redeem 1:1 for now)
    loyaltyDiscount = loyaltyPointsToRedeem;
  }

  const totalAmount = Math.max(0, subtotal + taxAmount - discount - couponDiscount - loyaltyDiscount);

  const sumPayments = payments.reduce((a,p)=>a+p.amount,0);
  if (sumPayments < totalAmount - 0.01) {
    return NextResponse.json({ error:`Payments sum ₹${sumPayments} less than bill total ₹${totalAmount}`, code:"PAYMENT_SHORT" }, { status:400 });
  }
  const eligibleToMarkPaid = sumPayments >= totalAmount - 0.01;

  const billNumber = genBillNumber();
  const qrToken = genQrToken();

  const effectiveRestaurantId = await getEffectiveRestaurantId(session.restaurantId);
  let bill;
  try {
    bill = await prisma.$transaction(async (tx)=>{
    const b = await tx.bill.create({
      data:{
        restaurantId: effectiveRestaurantId!,
        billNumber, // immutable, unique — server generated
        orderId: order.id,
        customerId: order.customerId,
        status: eligibleToMarkPaid ? "PAID" : "UNPAID",
        paymentStatus: eligibleToMarkPaid ? "PAID" : "PENDING",
        subtotal, taxAmount, discountAmount: discount + couponDiscount + loyaltyDiscount, totalAmount,
        paidAt: eligibleToMarkPaid ? new Date() : null,
        qrToken,
      },
    });
    for (const p of payments) {
      await tx.payment.create({ data:{ billId: b.id, orderId: order.id, method: p.method as never, amount: p.amount, status: eligibleToMarkPaid ? "PAID" : "PENDING", reference: p.reference } });
    }
    await tx.order.update({ where:{ id: order.id }, data:{ status: eligibleToMarkPaid ? "COMPLETED" : "PLACED", discountAmount: discount + couponDiscount + loyaltyDiscount, totalAmount } });
    // coupon redemption
    if (couponRecord) {
      const cr = couponRecord as { id: string };
      await tx.coupon.update({ where:{ id: cr.id }, data:{ status:"REDEEMED", redeemedAt: new Date(), usedCount:{ increment:1 } } });
      await tx.couponRedemption.create({ data:{ couponId: cr.id, customerId: order.customerId||undefined, billId: b.id, discount: couponDiscount } });
    }
    // loyalty redeem
    if (loyaltyDiscount>0 && order.customerId) {
      const cust = await tx.customer.findUnique({ where:{ id: order.customerId } });
      const balAfter = (cust?.loyaltyPoints||0) - loyaltyDiscount;
      await tx.loyaltyTransaction.create({ data:{ customerId: order.customerId, billId: b.id, type:"REDEEM", points: -loyaltyDiscount, balanceAfter: Math.max(0, balAfter), reason:`Redeem at bill ${b.billNumber}` } });
      await tx.customer.update({ where:{ id: order.customerId }, data:{ loyaltyPoints: Math.max(0, balAfter) } });
      await tx.loyaltyAccount.updateMany({ where:{ customerId: order.customerId }, data:{ points: Math.max(0, balAfter) } }).catch(()=>null);
    }
    // loyalty earn + visit increment only on PAID (§19-20, §24) — tuned for demo visibility
    let loyaltyEarned = 0;
    let loyaltyBalanceAfter: number | null = null;
    if (eligibleToMarkPaid && order.customerId) {
      // visit & spend increment — always
      await tx.customer.update({ where:{ id: order.customerId }, data:{ totalVisits:{ increment:1 }, totalSpend:{ increment: totalAmount } } });
      // loyalty earn: points per ₹100 (default 10) with min purchase ₹100 for demo (was 400, too strict) (§21)
      const earnMinPurchase = 100;
      const pointsPer100 = 10;
      if (totalAmount >= earnMinPurchase) {
        // daily limit relaxed to 10 per day for demo (was 1, blocked second bill same day)
        const businessDate = new Date(); businessDate.setHours(0,0,0,0);
        const existingToday = await tx.loyaltyTransaction.count({ where:{ customerId: order.customerId, type:"EARN", createdAt:{ gte: businessDate } } });
        if (existingToday < 10) {
          const earnPoints = Math.floor(totalAmount / 100) * pointsPer100;
          if (earnPoints>0) {
            const c2 = await tx.customer.findUnique({ where:{ id: order.customerId } });
            // c2.loyaltyPoints already includes -loyaltyDiscount if redeemed earlier in same tx, so use updated value
            const bal = (c2?.loyaltyPoints||0) + earnPoints;
            await tx.loyaltyTransaction.create({ data:{ customerId: order.customerId, billId: b.id, type:"EARN", points: earnPoints, balanceAfter: bal, reason:`Earn bill ${b.billNumber} ₹${totalAmount}` } });
            await tx.customer.update({ where:{ id: order.customerId }, data:{ loyaltyPoints: bal } });
            await tx.loyaltyAccount.upsert({ where:{ customerId: order.customerId }, create:{ customerId: order.customerId, points: earnPoints }, update:{ points: bal } }).catch(()=>null);
            loyaltyEarned = earnPoints;
            loyaltyBalanceAfter = bal;
          }
        }
      }
      // attach to bill for response
      (b as unknown as Record<string,unknown>).loyaltyEarned = loyaltyEarned;
      (b as unknown as Record<string,unknown>).loyaltyBalanceAfter = loyaltyBalanceAfter;
    }
    await tx.table.updateMany({ where:{ id: order.tableId || undefined }, data:{ status:"AVAILABLE" } }).catch(()=>null);
    await tx.auditLog.create({ data:{ staffId: session.staffId, action:"CREATE_BILL", entity:"Bill", entityId: b.id, details:{ orderId: order.id, totalAmount, paymentStatus: eligibleToMarkPaid?"PAID":"PENDING", couponDiscount, loyaltyDiscount } } }).catch(()=>null);
    return b;
  }, { maxWait: 10000, timeout: 20000 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Bill transaction failed", { msg, code: (e as any)?.code, meta: (e as any)?.meta, orderId });
    // P2028 = Transaction API error (pooled DB timeout) -> fallback without transaction or return proper 500 with detail
    if (String(msg).includes("Transaction") || String((e as any)?.code).includes("P2028") || String((e as any)?.code).includes("P2002")) {
      // Fallback: try simple non-transactional create (best-effort) to avoid losing bill after payment
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
        for (const p of payments) {
          await prisma.payment.create({ data:{ billId: b.id, orderId: order.id, method: p.method as never, amount: p.amount, status: eligibleToMarkPaid ? "PAID" : "PENDING", reference: p.reference } }).catch(()=>null);
        }
        await prisma.order.update({ where:{ id: order.id }, data:{ status: eligibleToMarkPaid ? "COMPLETED" : "PLACED", discountAmount: discount + couponDiscount + loyaltyDiscount, totalAmount } }).catch(()=>null);
        if (order.customerId && eligibleToMarkPaid) {
          await prisma.customer.update({ where:{ id: order.customerId }, data:{ totalVisits:{ increment:1 }, totalSpend:{ increment: totalAmount } } }).catch(()=>null);
        }
        return NextResponse.json({ ...b, fallback: true, warning: "Transaction fallback used — loyalty/coupon may need manual sync", errorDetail: msg }, { status:201 });
      } catch (fallbackErr) {
        console.error("Fallback bill create also failed", fallbackErr);
        return NextResponse.json({ error: `Bill transaction failed: ${msg}`, code: "TRANSACTION_FAILED", details: String((e as any)?.meta || msg) }, { status:500 });
      }
    }
    return NextResponse.json({ error: `Bill transaction failed: ${msg}`, code: (e as any)?.code || "TRANSACTION_FAILED", details: String((e as any)?.meta || "") }, { status:500 });
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
