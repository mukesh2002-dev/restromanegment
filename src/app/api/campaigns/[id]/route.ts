export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const partial = z.object({
  name: z.string().min(2).max(80).optional(),
  isActive: z.boolean().optional(),
  minRating: z.number().int().min(1).max(5).optional(),
  rewardType: z.enum(["PERCENTAGE","FIXED","FREE_ITEM","LOYALTY_POINTS"]).optional(),
  rewardValue: z.number().min(0).max(10000).optional(),
  rewardMaxDiscount: z.number().min(0).optional(),
  minSpend: z.number().min(0).optional(),
  validTo: z.string().optional().or(z.literal("")),
  couponPrefix: z.string().min(2).max(10).optional(),
  couponExpiryDays: z.number().int().min(1).max(365).optional(),
  loyaltyPoints: z.number().int().min(0).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id:string }> }){
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  if (!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  const body = await req.json().catch(()=>null);
  const parsed = partial.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten() }, { status:400 });
  const dbOk = await isDbAvailable();
  if (!dbOk) return NextResponse.json({ id, ...parsed.data, updatedAt: new Date().toISOString() });
  try{
    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.validTo === "") data.validTo = null;
    else if (parsed.data.validTo) data.validTo = new Date(parsed.data.validTo as string);
    const updated = await prisma.campaign.update({ where:{ id }, data: data as never });
    return NextResponse.json(updated);
  } catch(e: unknown){ return NextResponse.json({ error: e instanceof Error? e.message:"Error"}, { status:400 }); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id:string }> }){
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  if (!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  const dbOk = await isDbAvailable();
  if (!dbOk) return NextResponse.json({ success:true, demo:true });
  try{ await prisma.campaign.delete({ where:{ id } }); return NextResponse.json({ success:true }); } catch(e: unknown){ return NextResponse.json({ error: e instanceof Error? e.message:"Error"}, { status:400 }); }
}

