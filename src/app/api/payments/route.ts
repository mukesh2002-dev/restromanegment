export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: Request){
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  const url=new URL(req.url);
  const take=Math.min(Number(url.searchParams.get("take")||"20"),100);
  const dbOk=await isDbAvailable();
  if(!dbOk){
    return NextResponse.json([{ id:"pay_demo_1", billId:"bill_0001", method:"CASH", amount:315, status:"PAID", createdAt: new Date().toISOString() }]);
  }
  const payments=await prisma.payment.findMany({ where:{ bill:{ restaurantId: session.restaurantId }}, orderBy:{ createdAt:"desc"}, take, include:{ bill:true }});
  return NextResponse.json(payments);
}

export async function POST(req: Request){
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER","CASHIER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const schema=z.object({ billId: z.string().min(1), amount: z.number().min(0.01), method: z.enum(["CASH","CARD","UPI","WALLET","ONLINE","SPLIT"]), reference: z.string().optional() });
  const parsed=schema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const { billId, amount, method, reference }=parsed.data;
  const dbOk=await isDbAvailable();
  if(!dbOk) return NextResponse.json({ id:`pay_${Date.now()}`, billId, amount, method, status:"PAID"},{status:201});
  return prisma.$transaction(async (tx)=>{
    const bill=await tx.bill.findUnique({ where:{ id: billId }});
    if(!bill) throw new Error("Bill not found");
    if(bill.restaurantId!==session.restaurantId) throw new Error("Bill not in restaurant");
    if(bill.paymentStatus==="PAID") throw new Error("Bill already PAID");
    const existing=await tx.payment.aggregate({ where:{ billId }, _sum:{ amount:true }});
    const paidSoFar=existing._sum.amount||0;
    if(paidSoFar + amount > bill.totalAmount + 0.01) throw new Error(`Payment exceeds bill total (paid ${paidSoFar} + ${amount} > ${bill.totalAmount})`);
    const payment=await tx.payment.create({ data:{ billId, orderId: bill.orderId, method: method as never, amount, status:"PAID" as never, reference }});
    const newTotal=paidSoFar+amount;
    if(newTotal >= bill.totalAmount -0.01){
      await tx.bill.update({ where:{ id: billId }, data:{ paymentStatus:"PAID" as never, status:"PAID" as never, paidAt: new Date() }});
    } else {
      await tx.bill.update({ where:{ id: billId }, data:{ paymentStatus:"PARTIAL" as never }});
    }
    await tx.auditLog.create({ data:{ staffId: session.staffId, action:"CREATE_PAYMENT", entity:"Payment", entityId: payment.id, details:{ billId, amount, method } as never }}).catch(()=>null);
    return NextResponse.json(payment,{status:201});
  }).catch((e: unknown)=>{
    const msg=e instanceof Error? e.message:"Error";
    if(msg.includes("already PAID")) return NextResponse.json({ error:msg},{status:409});
    if(msg.includes("exceeds")) return NextResponse.json({ error:msg},{status:400});
    return NextResponse.json({ error:msg},{status:400});
  });
}

