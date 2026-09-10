export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { prisma, isDbAvailable } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { randomBytes } from "crypto";

// POST /api/loyalty/stamp { orderId, customerPhone, campaignId? }
function normalizePhone(p: string){
  const d = String(p).replace(/\D/g,"");
  if(d.length===12 && d.startsWith("91")) return d.slice(2);
  if(d.length===11 && d.startsWith("0")) return d.slice(1);
  return d;
}
export async function POST(req: Request){
  const body = await req.json().catch(()=>null);
  let { orderId, customerPhone, campaignId } = body||{};
  if(!orderId || !customerPhone) return NextResponse.json({ error:"orderId and customerPhone required" }, { status:400 });
  customerPhone = normalizePhone(String(customerPhone));
  if(!/^[6-9]\d{9}$/.test(customerPhone)) return NextResponse.json({ error:"Invalid Indian mobile — must be 10 digits starting 6-9", code:"INVALID_PHONE" }, { status:400 });
  const dbOk = await isDbAvailable();
  if(!dbOk) return NextResponse.json({ error:"DB not available" }, { status:500 });

  const order = await prisma.order.findUnique({ where:{ id: orderId }, include:{ bill:true } });
  if(!order) return NextResponse.json({ error:"Order not found" }, { status:404 });
  if(!order.bill || order.bill.paymentStatus!=="PAID") return NextResponse.json({ error:"Order not paid" }, { status:400 });

  // Find campaign (active, within dates)
  let campaign;
  if(campaignId) campaign = await prisma.campaign.findUnique({ where:{ id: campaignId } });
  else campaign = await prisma.campaign.findFirst({ where:{ isActive:true, validFrom:{ lte: new Date() } }, orderBy:{ requiredStars:"asc" } });
  if(!campaign) return NextResponse.json({ error:"No active campaign" }, { status:404 });

  const minOrder = (campaign as any).minimumOrderAmount ?? campaign.minSpend ?? 300;
  if(order.totalAmount < minOrder) return NextResponse.json({ error:`Order ₹${order.totalAmount} below minimum ₹${minOrder}`, code:"MIN_ORDER" }, { status:400 });

  // Find or create customer by phone
  let customer = await prisma.customer.findFirst({ where:{ phone: customerPhone } });
  if(!customer){
    const restaurantId = order.restaurantId;
    customer = await prisma.customer.create({ data:{ restaurantId, name:"Loyalty Customer", phone: customerPhone } });
  }

  // Daily limit
  const maxPerDay = (campaign as any).maxStarsPerDay ?? 1;
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayCount = await prisma.loyaltyStamp.count({ where:{ customerId: customer.id, campaignId: campaign.id, earnedAt:{ gte: todayStart } } });
  if(todayCount >= maxPerDay) return NextResponse.json({ error:"Daily stamp limit reached", code:"DAILY_LIMIT" }, { status:400 });

  // Check duplicate order
  const dup = await prisma.loyaltyStamp.findFirst({ where:{ orderId, campaignId: campaign.id } });
  if(dup) return NextResponse.json({ error:"Stamp already exists for this order", code:"DUPLICATE" }, { status:409 });

  // Find or create active card
  let card = await prisma.loyaltyCard.findFirst({ where:{ customerId: customer.id, campaignId: campaign.id, status:"ACTIVE" } });
  if(!card){
    const requiredStars = (campaign as any).requiredStars ?? 4;
    const cardValidityDays = (campaign as any).cardValidityDays ?? 30;
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate()+cardValidityDays);
    card = await prisma.loyaltyCard.create({
      data:{ customerId: customer.id, campaignId: campaign.id, restaurantId: campaign.restaurantId, requiredStars, expiresAt, currentStars:0, status:"ACTIVE" }
    });
  }
  // Check card expired
  if(card.expiresAt < new Date()){
    await prisma.loyaltyCard.update({ where:{ id: card.id }, data:{ status:"EXPIRED" } });
    // create new card
    const requiredStars = (campaign as any).requiredStars ?? 4;
    const cardValidityDays = (campaign as any).cardValidityDays ?? 30;
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate()+cardValidityDays);
    card = await prisma.loyaltyCard.create({
      data:{ customerId: customer.id, campaignId: campaign.id, restaurantId: campaign.restaurantId, requiredStars, expiresAt, currentStars:0, status:"ACTIVE" }
    });
  }

  const stampNumber = card.currentStars + 1;
  const stamp = await prisma.loyaltyStamp.create({
    data:{ loyaltyCardId: card.id, customerId: customer.id, campaignId: campaign.id, orderId: order.id, stampNumber, status:"ACTIVE" }
  });
  const updatedCard = await prisma.loyaltyCard.update({ where:{ id: card.id }, data:{ currentStars: stampNumber, status: stampNumber >= card.requiredStars ? "COMPLETED" : "ACTIVE", completedAt: stampNumber >= card.requiredStars ? new Date() : null } });

  // If completed, create reward
  let reward = null;
  if(updatedCard.status==="COMPLETED"){
    const rewardType = campaign.rewardType;
    const discountPercentage = rewardType==="PERCENTAGE" ? campaign.rewardValue : null;
    const maximumDiscountAmount = campaign.rewardMaxDiscount;
    const minimumOrderAmount = (campaign as any).rewardMinimumOrder ?? 300;
    const rewardValidityDays = campaign.couponExpiryDays ?? 15;
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate()+rewardValidityDays);
    const couponCode = `${campaign.couponPrefix}-${randomBytes(3).toString("hex").toUpperCase()}`;
    reward = await prisma.loyaltyReward.create({
      data:{
        customerId: customer.id, loyaltyCardId: card.id, campaignId: campaign.id,
        rewardType, discountPercentage, maximumDiscountAmount, minimumOrderAmount,
        couponCode, validFrom: new Date(), expiresAt, status:"AVAILABLE"
      }
    });
  }

  // Activity log
  await prisma.loyaltyActivityLog.create({ data:{ customerId: customer.id, campaignId: campaign.id, loyaltyCardId: card.id, orderId: order.id, rewardId: reward?.id, action:"STAR_EARNED", description:`Stamp ${stampNumber}/${card.requiredStars} for order ${order.orderNumber}` } }).catch(()=>null);

  return NextResponse.json({ stamp, card: updatedCard, reward, eligible: true });
}
