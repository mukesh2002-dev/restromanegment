export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { prisma, isDbAvailable } from "@/lib/db";
import { randomBytes } from "crypto";

export async function POST(req: Request){
  const body = await req.json().catch(()=>null);
  const { orderId, campaignId } = body||{};
  if(!orderId) return NextResponse.json({ error:"orderId required" }, { status:400 });
  const dbOk = await isDbAvailable();
  if(!dbOk) {
    const token = randomBytes(8).toString("hex").toUpperCase();
    return NextResponse.json({ secureToken: token, expiresAt: new Date(Date.now()+24*3600000).toISOString(), qrUrl: `/loyalty/claim/${token}` });
  }
  const order = await prisma.order.findUnique({ where:{ id: orderId } });
  if(!order) return NextResponse.json({ error:"Order not found" }, { status:404 });
  let campaign = null;
  if(campaignId) campaign = await prisma.campaign.findUnique({ where:{ id: campaignId } });
  else campaign = await prisma.campaign.findFirst({ where:{ isActive:true } });
  const qrValidityHours = (campaign as any)?.qrValidityHours ?? 24;
  const expiresAt = new Date(); expiresAt.setHours(expiresAt.getHours()+qrValidityHours);
  const secureToken = randomBytes(10).toString("hex").toUpperCase();
  const qr = await prisma.loyaltyQrToken.create({
    data:{ orderId: order.id, campaignId: campaign?.id, secureToken, status:"ACTIVE", expiresAt }
  });
  return NextResponse.json({ secureToken: qr.secureToken, expiresAt: qr.expiresAt, qrUrl: `/loyalty/claim/${qr.secureToken}`, qrId: qr.id });
}

export async function GET(req: Request){
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if(!token) return NextResponse.json({ error:"token required" }, { status:400 });
  const qr = await prisma.loyaltyQrToken.findUnique({ where:{ secureToken: token }, include:{ order:true } });
  if(!qr) return NextResponse.json({ error:"QR not found" }, { status:404 });
  if(qr.status!=="ACTIVE") return NextResponse.json({ error:`QR ${qr.status}`, status:qr.status }, { status:400 });
  if(qr.expiresAt < new Date()){
    await prisma.loyaltyQrToken.update({ where:{ id: qr.id }, data:{ status:"EXPIRED" } }).catch(()=>null);
    return NextResponse.json({ error:"QR expired", status:"EXPIRED" }, { status:410 });
  }
  return NextResponse.json({ qr, order: qr.order });
}
