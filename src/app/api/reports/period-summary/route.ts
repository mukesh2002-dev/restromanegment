import { NextResponse } from "next/server";
import { isDbAvailable, prisma, getEffectiveRestaurantId } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { demoBills } from "@/data/demo";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d: Date) { const x = new Date(d); const day = x.getDay(); // Sun=0, make Mon start
  const diff = (day === 0 ? -6 : 1 - day); x.setDate(x.getDate()+diff); x.setHours(0,0,0,0); return x; }
function startOfMonth(d: Date) { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dbOk = await isDbAvailable();
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  if (!dbOk) {
    // demo fallback - filter demoBills
    const calc = (bills: typeof demoBills) => ({
      count: bills.length,
      paidCount: bills.filter(b=>b.paymentStatus==="PAID").length,
      amount: bills.filter(b=>b.paymentStatus==="PAID").reduce((a,b)=>a+b.totalAmount,0),
      pendingAmount: bills.filter(b=>b.paymentStatus!=="PAID").reduce((a,b)=>a+b.totalAmount,0),
    });
    const total = calc(demoBills);
    const today = calc(demoBills.filter(b=> new Date(b.createdAt) >= todayStart));
    const week = calc(demoBills.filter(b=> new Date(b.createdAt) >= weekStart));
    const month = calc(demoBills.filter(b=> new Date(b.createdAt) >= monthStart));
    // by method breakdown for total
    const methods = ["CASH","UPI","CARD","ONLINE","WALLET"];
    const byMethod = methods.map((m,i)=> {
      const filtered = demoBills.filter((_,idx)=> idx%5===i);
      return { method: m, count: filtered.length, amount: filtered.reduce((a,b)=>a+b.totalAmount,0) };
    });
    return NextResponse.json({
      today, week, month, total,
      byMethod,
      generatedAt: now.toISOString(),
      source: "demo",
    });
  }

  const rid = (await getEffectiveRestaurantId(session.restaurantId)) || session.restaurantId;

  // helper to aggregate
  async function agg(where: any) {
    const bills = await prisma.bill.findMany({ where, select: { totalAmount: true, paymentStatus: true } });
    return {
      count: bills.length,
      paidCount: bills.filter(b=>b.paymentStatus==="PAID").length,
      amount: bills.filter(b=>b.paymentStatus==="PAID").reduce((a,b)=>a+b.totalAmount,0),
      pendingAmount: bills.filter(b=>b.paymentStatus!=="PAID").reduce((a,b)=>a+b.totalAmount,0),
    };
  }

  const [today, week, month, total] = await Promise.all([
    agg({ restaurantId: rid, createdAt: { gte: todayStart } }),
    agg({ restaurantId: rid, createdAt: { gte: weekStart } }),
    agg({ restaurantId: rid, createdAt: { gte: monthStart } }),
    agg({ restaurantId: rid }),
  ]);

  // byMethod for total
  const payments = await prisma.payment.findMany({ where: { bill: { restaurantId: rid } }, select: { method: true, amount: true, status: true } });
  const map: Record<string,{count:number,amount:number}> = {};
  for(const p of payments){
    if(p.status!=="PAID") continue;
    if(!map[p.method]) map[p.method]={count:0,amount:0};
    map[p.method].count+=1; map[p.method].amount+=p.amount;
  }
  const byMethod = Object.entries(map).map(([method,v])=>({method,...v}));

  return NextResponse.json({ today, week, month, total, byMethod, generatedAt: now.toISOString(), source: "db" });
}
