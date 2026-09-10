export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { demoCoupons } from "@/data/demo";

export async function GET(req: Request){
  const url=new URL(req.url);
  const couponId=url.searchParams.get("couponId");
  const take=Math.min(Number(url.searchParams.get("take")||"20"),100);
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const list=demoCoupons.filter(c=> c.status==="REDEEMED").slice(0,take).map(c=> ({ id:`red_${c.id}`, couponId: c.id, couponCode: c.code, discount: c.value, redeemedAt: c.expiryDate }));
    return NextResponse.json(list);
  }
  const where:Record<string,unknown>={};
  if(couponId) (where as Record<string,unknown>).couponId=couponId;
  const list=await prisma.couponRedemption.findMany({ where: where as never, orderBy:{ redeemedAt:"desc"}, take, include:{ coupon:true }});
  return NextResponse.json(list);
}

export async function POST(req: Request){
  const body = await req.json().catch(()=>null);
  const { code, orderTotal, customerPhone } = body || {};
  if (!code) return NextResponse.json({ error:"Coupon code required" }, { status:400 });
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const coupon = demoCoupons.find(c=> c.code===code);
    if (!coupon) return NextResponse.json({ error:"Coupon not found", code:"COUPON_NOT_FOUND" }, { status:404 });
    if (coupon.status!=="ACTIVE") return NextResponse.json({ error:`Coupon ${coupon.status}`, code:"COUPON_INVALID" }, { status:400 });
    if (new Date(coupon.expiryDate) < new Date()) return NextResponse.json({ error:"Coupon expired", code:"COUPON_EXPIRED" }, { status:400 });
    if (customerPhone && coupon.customerId) {
      const expected = demoCoupons.find(c=> c.code===code)?.customerId;
      // demo ownership soft-check
      if (expected && !String(expected).includes(customerPhone.slice(-4))) {
        // allow for demo
      }
    }
    const value = typeof orderTotal==="number" ? orderTotal : 500;
    let discount = coupon.rewardType==="PERCENTAGE" ? Math.round(value * Number(coupon.value)/100) : Number(coupon.value);
    // demo maxDiscount not in demo data, skip
    return NextResponse.json({ valid:true, code: coupon.code, discount, coupon });
  }
  const coupon = await prisma.coupon.findUnique({ where:{ code: code.trim().toUpperCase() } });
  if (!coupon) return NextResponse.json({ error:"Coupon not found", code:"COUPON_NOT_FOUND" }, { status:404 });
  if (coupon.status!=="ACTIVE") return NextResponse.json({ error:`Coupon is ${coupon.status}`, code:"COUPON_INVALID" }, { status:400 });
  if (coupon.expiryDate < new Date()) return NextResponse.json({ error:"Coupon expired", code:"COUPON_EXPIRED" }, { status:400 });
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return NextResponse.json({ error:"Usage limit reached", code:"COUPON_LIMIT" }, { status:400 });
  if (coupon.customerId && customerPhone) {
    const cust = await prisma.customer.findFirst({ where:{ phone: customerPhone } });
    if (cust && coupon.customerId !== cust.id) return NextResponse.json({ error:"Coupon does not belong to this customer", code:"COUPON_OWNERSHIP" }, { status:403 });
  } else if (coupon.customerId && !customerPhone) {
    return NextResponse.json({ error:"Coupon is customer-specific â€” provide mobile", code:"COUPON_OWNERSHIP" }, { status:400 });
  }
  const total = typeof orderTotal==="number" ? orderTotal : 0;
  if (total < Number(coupon.minSpend)) return NextResponse.json({ error:`Minimum order â‚¹${coupon.minSpend} required`, code:"COUPON_MIN_SPEND" }, { status:400 });
  let discount = 0;
  if (coupon.rewardType==="PERCENTAGE") {
    discount = Math.round(total * Number(coupon.value)/100);
    if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
  } else {
    discount = Number(coupon.value);
  }
  discount = Math.min(discount, total);
  return NextResponse.json({ valid:true, code: coupon.code, discount, coupon });
}

