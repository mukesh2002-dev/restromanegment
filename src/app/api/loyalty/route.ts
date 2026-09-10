export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { demoLoyaltyTx, demoCustomers } from "@/data/demo";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: Request){
  const url = new URL(req.url);
  const customerId = url.searchParams.get("customerId");
  const take = Math.min(Number(url.searchParams.get("take")||"20"), 100);
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    let list=[...demoLoyaltyTx];
    if (customerId) list=list.filter(l=>l.customerId===customerId);
    return NextResponse.json(list.slice(0,take));
  }
  const where: Record<string, unknown> = {};
  if (customerId) (where as Record<string,unknown>).customerId = customerId;
  const txs = await prisma.loyaltyTransaction.findMany({ where, orderBy:{ createdAt:"desc"}, take, include:{ customer:true } });
  return NextResponse.json(txs);
}

export async function POST(req: Request){
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  if (!["OWNER","MANAGER","CASHIER"].includes(session.role)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  const body = await req.json().catch(()=>null);
  const schema = z.object({ customerId: z.string().min(1), type: z.enum(["EARN","REDEEM","ADJUSTMENT","EXPIRY"]), points: z.number().int().refine(v=>v!==0), reason: z.string().min(2).max(200), billId: z.string().optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten() }, { status:400 });
  const { customerId, type, points, reason, billId } = parsed.data;
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const cust = demoCustomers.find(c=>c.id===customerId);
    if (!cust) return NextResponse.json({ error:"Customer not found" }, { status:404 });
    const tx = { id:`ltx_${Date.now()}`, customerId, billId: billId||null, type, points, balanceAfter: cust.loyaltyPoints + points, reason, createdAt: new Date().toISOString() };
    return NextResponse.json(tx, { status:201 });
  }
  const cust = await prisma.customer.findUnique({ where:{ id: customerId } });
  if (!cust) return NextResponse.json({ error:"Customer not found" }, { status:404 });
  if (type==="REDEEM" && cust.loyaltyPoints < Math.abs(points)) return NextResponse.json({ error:"Insufficient points" }, { status:400 });
  const newBalance = cust.loyaltyPoints + points;
  const tx = await prisma.loyaltyTransaction.create({ data:{ customerId, billId: billId||null, type: type as never, points, balanceAfter: newBalance, reason } });
  await prisma.customer.update({ where:{ id: customerId }, data:{ loyaltyPoints: newBalance } });
  await prisma.auditLog.create({ data:{ staffId: session.staffId, action:`LOYALTY_${type}`, entity:"LoyaltyTransaction", entityId: tx.id, details:{ customerId, points, reason } } }).catch(()=>null);
  return NextResponse.json(tx, { status:201 });
}

