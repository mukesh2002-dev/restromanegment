export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { prisma, isDbAvailable } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request){
  const url = new URL(req.url);
  const customerId = url.searchParams.get("customerId");
  const phone = url.searchParams.get("phone");
  const dbOk = await isDbAvailable();
  if(!dbOk) return NextResponse.json([]);
  let custId = customerId;
  if(phone && !custId){
    const c = await prisma.customer.findFirst({ where:{ phone } });
    if(c) custId = c.id;
  }
  if(!custId) return NextResponse.json([]);
  const cards = await prisma.loyaltyCard.findMany({
    where:{ customerId: custId },
    include:{ campaign:true, stamps:true },
    orderBy:{ startedAt:"desc" }
  });
  return NextResponse.json(cards);
}

export async function POST(req: Request){
  const session = await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const body = await req.json().catch(()=>null);
  const { customerId, campaignId } = body||{};
  if(!customerId || !campaignId) return NextResponse.json({ error:"customerId and campaignId required" }, { status:400 });
  const campaign = await prisma.campaign.findUnique({ where:{ id: campaignId } });
  if(!campaign) return NextResponse.json({ error:"Campaign not found" }, { status:404 });
  const requiredStars = (campaign as any).requiredStars||4;
  const cardValidityDays = (campaign as any).cardValidityDays||30;
  const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate()+cardValidityDays);
  const card = await prisma.loyaltyCard.create({
    data:{
      customerId, campaignId, restaurantId: campaign.restaurantId,
      requiredStars, expiresAt, currentStars:0, status:"ACTIVE"
    }
  });
  return NextResponse.json(card, { status:201 });
}
