import { NextResponse } from "next/server";
import { couponRedeemSchema } from "@/lib/validators";
import { prisma, isDbAvailable } from "@/lib/db";
import { demoCoupons } from "@/data/demo";

export async function POST(req: Request) {
  const body = await req.json().catch(()=>null);
  const parsed = couponRedeemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid input", details: parsed.error.flatten() }, { status:400 });
  const { code, orderTotal } = parsed.data;
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const c = demoCoupons.find(x=> x.code===code);
    if (!c) return NextResponse.json({ error:"Coupon not found", code:"NOT_FOUND" }, { status:404 });
    if (c.status!=="ACTIVE") return NextResponse.json({ error:"Coupon not active", code:"INVALID_STATUS" }, { status:400 });
    if (orderTotal < 200) return NextResponse.json({ error:"Minimum spend not met", code:"MIN_SPEND" }, { status:400 });
    // compute discount
    const discount = c.rewardType==="PERCENTAGE" ? Math.round(orderTotal * (c.value as number)/100) : c.value as number;
    return NextResponse.json({ success:true, discount, coupon:c, mode:"demo" });
  }
  const coupon = await prisma.coupon.findUnique({ where:{ code } });
  if (!coupon) return NextResponse.json({ error:"Coupon not found", code:"NOT_FOUND" }, { status:404 });
  if (coupon.status!=="ACTIVE") return NextResponse.json({ error:"Coupon not active", code:"INVALID_STATUS" }, { status:400 });
  if (coupon.expiryDate < new Date()) return NextResponse.json({ error:"Coupon expired", code:"EXPIRED" }, { status:400 });
  if (coupon.usedCount >= coupon.usageLimit) return NextResponse.json({ error:"Usage limit reached", code:"LIMIT" }, { status:400 });
  if (orderTotal < coupon.minSpend) return NextResponse.json({ error:"Minimum spend not met", code:"MIN_SPEND" }, { status:400 });
  let discount = 0;
  if (coupon.rewardType==="PERCENTAGE") {
    discount = Math.round(orderTotal * coupon.value/100);
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  } else if (coupon.rewardType==="FIXED") discount = coupon.value;
  else discount = 0;
  await prisma.coupon.update({ where:{ code }, data:{ status:"REDEEMED", redeemedAt:new Date(), usedCount:{ increment:1 } } });
  await prisma.auditLog.create({ data:{ action:"REDEEM_COUPON", entity:"Coupon", entityId: coupon.id, details:{ code, discount } } });
  return NextResponse.json({ success:true, discount, coupon });
}
