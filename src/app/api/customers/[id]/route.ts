import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { demoCustomers, demoBills, demoReviews, demoLoyaltyTx, demoCoupons } from "@/data/demo";

export async function GET(_req: Request, { params }: { params: Promise<{ id:string }> }) {
  const { id } = await params;
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const c = demoCustomers.find(x=> x.id===id || x.phone===id);
    if (!c) return NextResponse.json({ error:"Not found" }, { status:404 });
    return NextResponse.json({
      ...c,
      bills: demoBills.filter(b=> b.customerId===c.id).slice(0,20),
      reviews: demoReviews.filter(r=> r.phone===c.phone).slice(0,20),
      loyaltyTxs: demoLoyaltyTx.filter(l=> l.customerId===c.id).slice(0,20),
      coupons: demoCoupons.filter(cp=> cp.customerId===c.id).slice(0,20),
      preferences: { marketingConsent: c.marketingConsent },
    });
  }
  const cust = await prisma.customer.findUnique({
    where:{ id },
    include:{
      bills: { orderBy:{ createdAt:"desc"}, take:20, include:{ payments:true } },
      reviews: { orderBy:{ createdAt:"desc"}, take:20 },
      loyaltyTxs: { orderBy:{ createdAt:"desc"}, take:20 },
      coupons: { orderBy:{ createdAt:"desc"}, take:20 },
      orders: { orderBy:{ createdAt:"desc"}, take:20 },
    }
  });
  if (!cust) return NextResponse.json({ error:"Not found" }, { status:404 });
  return NextResponse.json(cust);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id:string }> }){
  const { id } = await params;
  const body = await req.json().catch(()=>null);
  const { name, email, birthday, marketingConsent, notes } = body || {};
  const dbOk = await isDbAvailable();
  if (!dbOk) return NextResponse.json({ id, name, email, birthday, marketingConsent, notes, updatedAt: new Date().toISOString() });
  try{
    const updated = await prisma.customer.update({ where:{ id }, data:{ name, email, birthday: birthday? new Date(birthday):undefined, marketingConsent, notes } });
    return NextResponse.json(updated);
  } catch(e: unknown){ return NextResponse.json({ error: e instanceof Error? e.message:"Error"}, { status:400 }); }
}
