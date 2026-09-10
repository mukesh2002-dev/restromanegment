export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { demoCampaigns } from "@/data/demo";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const campaignSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(300).optional(),
  isActive: z.boolean().optional(),
  minRating: z.number().int().min(1).max(5),
  rewardType: z.enum(["PERCENTAGE","FIXED","FREE_ITEM","LOYALTY_POINTS"]),
  rewardValue: z.number().min(0).max(10000),
  rewardMaxDiscount: z.number().min(0).optional(),
  minSpend: z.number().min(0).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional().or(z.literal("")),
  couponPrefix: z.string().min(2).max(10).optional(),
  couponExpiryDays: z.number().int().min(1).max(365).optional(),
  loyaltyPoints: z.number().int().min(0).optional(),
  freeItemId: z.string().optional().or(z.literal("")),
});

export async function GET(){
  const dbOk = await isDbAvailable();
  if (!dbOk) return NextResponse.json(demoCampaigns);
  const session = await getSession();
  const camps = await prisma.campaign.findMany({ where:{ restaurantId: session?.restaurantId }, orderBy:{ minRating:"desc" } });
  return NextResponse.json(camps);
}

export async function POST(req: Request){
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  if (!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  const body = await req.json().catch(()=>null);
  const parsed = campaignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten() }, { status:400 });
  const dbOk = await isDbAvailable();
  const slug = (parsed.data.slug || parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")).slice(0,40);
  if (!dbOk) {
    const created = { id:`camp_${Date.now()}`, restaurantId: session.restaurantId, slug, ...parsed.data, validFrom: parsed.data.validFrom || new Date().toISOString(), validTo: parsed.data.validTo || null };
    return NextResponse.json(created, { status:201 });
  }
  try{
    const created = await prisma.campaign.create({
      data:{
        restaurantId: session.restaurantId,
        name: parsed.data.name, slug, description: parsed.data.description, isActive: parsed.data.isActive??true,
        minRating: parsed.data.minRating, rewardType: parsed.data.rewardType as never, rewardValue: parsed.data.rewardValue,
        rewardMaxDiscount: parsed.data.rewardMaxDiscount, minSpend: parsed.data.minSpend||0,
        validFrom: parsed.data.validFrom? new Date(parsed.data.validFrom): new Date(),
        validTo: parsed.data.validTo? new Date(parsed.data.validTo): null,
        couponPrefix: parsed.data.couponPrefix||"REWARD", couponExpiryDays: parsed.data.couponExpiryDays||30,
        loyaltyPoints: parsed.data.loyaltyPoints, freeItemId: parsed.data.freeItemId||null,
      }
    });
    return NextResponse.json(created, { status:201 });
  } catch(e: unknown){
    const msg = e instanceof Error? e.message:"Error";
    if (msg.includes("Unique")) return NextResponse.json({ error:"Slug already exists" }, { status:409 });
    return NextResponse.json({ error: msg }, { status:500 });
  }
}

