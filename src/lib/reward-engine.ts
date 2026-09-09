/**
 * Critical Reward Engine - Server-side validation only.
 * One paid bill = maximum one reward claim.
 * Unique constraint on Reward.billId at DB level + transactional check.
 */
import { prisma } from "./db";

export type RewardEligibilityResult =
  | { eligible: true; campaignId: string; rewardType: string; value: number }
  | { eligible: false; reason: string; code: string };

export async function validateRewardEligibility(params: {
  billId: string;
  qrToken?: string;
  rating: number;
  ipAddress?: string;
}): Promise<RewardEligibilityResult> {
  const bill = await prisma.bill.findUnique({
    where: { id: params.billId },
    include: { order: true, reward: true },
  });
  if (!bill) return { eligible: false, reason: "Bill not found", code: "BILL_NOT_FOUND" };
  if (params.qrToken && bill.qrToken && bill.qrToken !== params.qrToken) {
    return { eligible: false, reason: "Invalid QR token", code: "INVALID_TOKEN" };
  }
  if (bill.paymentStatus !== "PAID") return { eligible: false, reason: "Bill not paid", code: "NOT_PAID" };
  if (bill.status !== "PAID") return { eligible: false, reason: "Bill status not paid", code: "BILL_NOT_PAID" };
  if (bill.reward) return { eligible: false, reason: "Reward already claimed for this bill", code: "ALREADY_CLAIMED" };

  // campaign lookup: restaurant's active campaigns where rating >= minRating
  const campaigns = await prisma.campaign.findMany({
    where: { restaurantId: bill.restaurantId, isActive: true, minRating: { lte: params.rating } },
    orderBy: { rewardValue: "desc" },
  });
  if (campaigns.length === 0) {
    return { eligible: false, reason: "No campaign for this rating", code: "NOT_ELIGIBLE" };
  }
  // choose most valuable eligible
  const campaign = campaigns[0];
  // optionally check validity window
  const now = new Date();
  if (campaign.validTo && now > campaign.validTo) {
    return { eligible: false, reason: "Campaign expired", code: "CAMPAIGN_EXPIRED" };
  }
  if (now < campaign.validFrom) {
    return { eligible: false, reason: "Campaign not started", code: "CAMPAIGN_NOT_STARTED" };
  }
  return { eligible: true, campaignId: campaign.id, rewardType: campaign.rewardType, value: campaign.rewardValue };
}

export async function claimRewardTx(params: {
  billId: string;
  customerId: string;
  reviewId?: string;
  campaignId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  // Transaction with unique constraint protection
  return prisma.$transaction(async (tx) => {
    const bill = await tx.bill.findUnique({ where: { id: params.billId } });
    if (!bill) throw new Error("BILL_NOT_FOUND");
    if (bill.paymentStatus !== "PAID") throw new Error("NOT_PAID");
    const existing = await tx.reward.findUnique({ where: { billId: params.billId } });
    if (existing) throw new Error("ALREADY_CLAIMED");

    const campaign = await tx.campaign.findUnique({ where: { id: params.campaignId } });
    if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");

    const couponCode = `${campaign.couponPrefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + campaign.couponExpiryDays);

    // Create coupon & reward atomically
    let coupon = null;
    let loyaltyTx = null;

    if (campaign.rewardType === "LOYALTY_POINTS" && campaign.loyaltyPoints) {
      loyaltyTx = await tx.loyaltyTransaction.create({
        data: {
          customerId: params.customerId,
          billId: params.billId,
          type: "EARN",
          points: campaign.loyaltyPoints,
          balanceAfter: 0, // will update after
          reason: `Reward for bill ${bill.billNumber} campaign ${campaign.name}`,
          expiryDate: expiry,
        },
      });
      await tx.customer.update({
        where: { id: params.customerId },
        data: { loyaltyPoints: { increment: campaign.loyaltyPoints } },
      });
      const cust = await tx.customer.findUnique({ where: { id: params.customerId } });
      if (cust) {
        await tx.loyaltyTransaction.update({
          where: { id: loyaltyTx.id },
          data: { balanceAfter: cust.loyaltyPoints },
        });
      }
    } else {
      coupon = await tx.coupon.create({
        data: {
          code: couponCode,
          campaignId: campaign.id,
          customerId: params.customerId,
          billId: params.billId,
          rewardType: campaign.rewardType,
          value: campaign.rewardValue,
          minSpend: campaign.minSpend,
          maxDiscount: campaign.rewardMaxDiscount,
          status: "ACTIVE",
          expiryDate: expiry,
        },
      });
    }

    const reward = await tx.reward.create({
      data: {
        billId: params.billId,
        customerId: params.customerId,
        reviewId: params.reviewId,
        campaignId: campaign.id,
        couponId: coupon?.id,
        loyaltyTxId: loyaltyTx?.id,
        pointsAwarded: campaign.loyaltyPoints,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    return { reward, coupon, loyaltyTx };
  });
}
