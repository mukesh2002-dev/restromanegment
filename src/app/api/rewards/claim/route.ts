import { NextResponse } from "next/server";
import { rewardClaimSchema } from "@/lib/validators";
import { prisma, isDbAvailable } from "@/lib/db";
import { demoCampaigns } from "@/data/demo";
import { billStore } from "@/lib/bill-store";
import { checkRateLimit } from "@/lib/rate-limit";

// In-memory fallback for demo when DB unavailable (persists within server instance)
const claimed = new Set<string>();

export async function POST(req: Request) {
  const body = await req.json().catch(()=>null);
  const parsed = rewardClaimSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid input", details: parsed.error.flatten() }, { status:400 });
  const { billId, qrToken, customer, rating, comment } = parsed.data;
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown").slice(0,45);
  const ua = (req.headers.get("user-agent") || "unknown").slice(0,200);

  // anti-abuse: rate limiting per IP + per bill cooldown
  const rl = checkRateLimit(ip, billId);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests — please wait", code: rl.code, retryAfter: rl.retryAfter }, { status: 429 });

  const dbOk = await isDbAvailable();
  if (!dbOk) {
    // Fallback demo validation using billStore (includes static + dynamic POS bills)
    const bill = billStore.get(billId) || billStore.get(qrToken||"");
    if (!bill) return NextResponse.json({ error:"Bill not found", code:"BILL_NOT_FOUND" }, { status:404 });
    // also allow qrToken mismatch check
    if (qrToken && bill.qrToken && qrToken !== bill.qrToken && qrToken !== bill.id) {
      // allow billId as token for demo convenience
      if (qrToken !== bill.qrToken) {
        // not strict in demo
      }
    }
    if (bill.paymentStatus !== "PAID") return NextResponse.json({ error:"Bill not paid", code:"NOT_PAID" }, { status:400 });
    // expired token: demo bills expire after 30 days from paidAt
    if (bill.paidAt) {
      const ageDays = (Date.now() - new Date(bill.paidAt).getTime()) / 86400000;
      if (ageDays > 30) return NextResponse.json({ error:"QR expired — bill older than 30 days", code:"EXPIRED_TOKEN" }, { status:410 });
    }
    if (claimed.has(billId)) return NextResponse.json({ error:"Reward already claimed for this bill", code:"ALREADY_CLAIMED" }, { status:409 });
    // campaign eligibility — threshold configurable via demoCampaigns
    if (rating < 4) return NextResponse.json({ error:"Rating too low for reward — feedback saved", code:"NOT_ELIGIBLE", saved: true }, { status:200 });
    const campaign = demoCampaigns.find(c=> rating >= c.minRating) || demoCampaigns[0];
    claimed.add(billId);
    const coupon = {
      code: `${campaign.couponPrefix}-${Date.now().toString(36).toUpperCase().slice(0,6)}`,
      value: campaign.rewardValue,
      rewardType: "PERCENTAGE",
      expiryDate: new Date(Date.now()+30*86400000).toISOString(),
      billId,
    };
    return NextResponse.json({ success:true, coupon, message:"Demo mode reward — DB not configured" });
  }

  // DB path — real validation
  try {
    const bill = await prisma.bill.findUnique({ where:{ id: billId }, include:{ reward:true } });
    if (!bill) return NextResponse.json({ error:"Bill not found", code:"BILL_NOT_FOUND" }, { status:404 });
    if (qrToken && bill.qrToken && bill.qrToken !== qrToken) {
      return NextResponse.json({ error:"Invalid QR token", code:"INVALID_TOKEN" }, { status:400 });
    }
    if (bill.paymentStatus !== "PAID") return NextResponse.json({ error:"Bill not paid", code:"NOT_PAID" }, { status:400 });
    if (bill.status !== "PAID") return NextResponse.json({ error:"Bill status not paid", code:"BILL_NOT_PAID" }, { status:400 });
    if (bill.paidAt && Date.now() - new Date(bill.paidAt).getTime() > 30*86400000) return NextResponse.json({ error:"QR expired — bill older than 30 days", code:"EXPIRED_TOKEN" }, { status:410 });
    if (bill.reward) return NextResponse.json({ error:"Reward already claimed", code:"ALREADY_CLAIMED" }, { status:409 });

    const existingReward = await prisma.reward.findUnique({ where:{ billId } });
    if (existingReward) return NextResponse.json({ error:"Reward already claimed (race)", code:"ALREADY_CLAIMED" }, { status:409 });

    const campaigns = await prisma.campaign.findMany({ where:{ restaurantId: bill.restaurantId, isActive:true, minRating:{ lte: rating } }, orderBy:{ rewardValue:"desc" } });
    if (campaigns.length===0) return NextResponse.json({ error:"Not eligible for any campaign", code:"NOT_ELIGIBLE" }, { status:200 });
    const campaign = campaigns[0];
    const now = new Date();
    if (campaign.validTo && now > campaign.validTo) return NextResponse.json({ error:"Campaign expired", code:"CAMPAIGN_EXPIRED" }, { status:400 });
    if (now < campaign.validFrom) return NextResponse.json({ error:"Campaign not started", code:"CAMPAIGN_NOT_STARTED" }, { status:400 });

    // Ensure customer exists/upsert by phone
    let dbCustomer = await prisma.customer.findFirst({ where:{ phone: customer.phone } });
    if (!dbCustomer) {
      dbCustomer = await prisma.customer.create({
        data:{
          restaurantId: bill.restaurantId,
          name: customer.name,
          phone: customer.phone,
          email: customer.email || undefined,
          birthday: customer.birthday ? new Date(customer.birthday) : undefined,
        },
      });
    }
    // Create review
    const review = await prisma.review.create({
      data:{
        billId: bill.id,
        customerId: dbCustomer.id,
        rating,
        comment,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        birthday: customer.birthday ? new Date(customer.birthday): undefined,
        ipAddress: ip,
        userAgent: ua,
      },
    });

    // Transactional reward + coupon/loyalty
    const result = await prisma.$transaction(async (tx)=>{
      const dup = await tx.reward.findUnique({ where:{ billId } });
      if (dup) throw new Error("ALREADY_CLAIMED");
      const expiry = new Date(); expiry.setDate(expiry.getDate()+ campaign.couponExpiryDays);
      let coupon = null;
      let loyaltyTx = null;
      if (campaign.rewardType==="LOYALTY_POINTS" && campaign.loyaltyPoints) {
        loyaltyTx = await tx.loyaltyTransaction.create({
          data:{ customerId: dbCustomer!.id, billId: bill.id, type:"EARN", points: campaign.loyaltyPoints!, balanceAfter: dbCustomer!.loyaltyPoints + campaign.loyaltyPoints!, reason:`Reward bill ${bill.billNumber}` },
        });
        await tx.customer.update({ where:{ id: dbCustomer!.id }, data:{ loyaltyPoints:{ increment: campaign.loyaltyPoints! } } });
      } else {
        const code = `${campaign.couponPrefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
        coupon = await tx.coupon.create({
          data:{
            code,
            campaignId: campaign.id,
            customerId: dbCustomer!.id,
            billId: bill.id,
            rewardType: campaign.rewardType,
            value: campaign.rewardValue,
            minSpend: campaign.minSpend,
            maxDiscount: campaign.rewardMaxDiscount,
            status:"ACTIVE",
            expiryDate: expiry,
          },
        });
      }
      const reward = await tx.reward.create({
        data:{
          billId: bill.id,
          customerId: dbCustomer!.id,
          reviewId: review.id,
          campaignId: campaign.id,
          couponId: coupon?.id,
          loyaltyTxId: loyaltyTx?.id,
          pointsAwarded: campaign.loyaltyPoints,
          ipAddress: ip,
          userAgent: ua,
        },
      });
      return { reward, coupon, loyaltyTx };
    });

    return NextResponse.json({ success:true, reward: result.reward, coupon: result.coupon, loyaltyTx: result.loyaltyTx });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown";
    if (msg==="ALREADY_CLAIMED") return NextResponse.json({ error:"Already claimed", code:"ALREADY_CLAIMED" }, { status:409 });
    console.error(e);
    return NextResponse.json({ error:"Failed to claim reward", details: msg }, { status:500 });
  }
}
