export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { prisma, isDbAvailable } from "@/lib/db";

export async function GET(req: Request){
  const url = new URL(req.url);
  const customerId = url.searchParams.get("customerId");
  const phone = url.searchParams.get("phone");
  const action = url.searchParams.get("action");
  const take = Math.min(Number(url.searchParams.get("take")||"50"), 100);
  const dbOk = await isDbAvailable();
  if(!dbOk) return NextResponse.json([]);

  let custId = customerId;
  if(phone && !custId){
    const c = await prisma.customer.findFirst({ where:{ phone } });
    if(c) custId = c.id;
  }

  const where: any = {};
  if(custId) where.customerId = custId;
  if(action) where.action = action;

  const logs = await prisma.loyaltyActivityLog.findMany({
    where, orderBy:{ createdAt:"desc" }, take
  });
  return NextResponse.json(logs);
}

export async function POST(req: Request){
  const body = await req.json().catch(()=>null);
  const { customerId, campaignId, loyaltyCardId, orderId, rewardId, action, oldValue, newValue, description, performedBy } = body||{};
  if(!action) return NextResponse.json({ error:"action required" }, { status:400 });
  const log = await prisma.loyaltyActivityLog.create({
    data:{ customerId, campaignId, loyaltyCardId, orderId, rewardId, action, oldValue: oldValue?String(oldValue):null, newValue: newValue?String(newValue):null, description, performedBy }
  });
  return NextResponse.json(log, { status:201 });
}
