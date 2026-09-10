export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { automationService } from "@/lib/automation-service";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const schema=z.object({
  name: z.string().min(2).max(80),
  event: z.enum(["WELCOME","BILL_RECEIPT","COUPON_ISSUED","COUPON_REMINDER","BIRTHDAY_OFFER","NEW_OFFER","ORDER_CONFIRMATION","DELIVERY_UPDATE","FEEDBACK_REQUEST"]),
  templateId: z.string().min(1),
  audience: z.record(z.string(), z.unknown()).optional(),
  schedule: z.enum(["IMMEDIATE","SCHEDULED","RECURRING_DAILY","RECURRING_WEEKLY"]).optional(),
  scheduledAt: z.string().optional(),
  couponRequired: z.boolean().optional(),
  couponValue: z.number().min(0).optional(),
  couponPrefix: z.string().max(10).optional(),
});

export async function GET(){
  const list=await automationService.listCampaigns();
  return NextResponse.json(list);
}

export async function POST(req: Request){
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const parsed=schema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const created=await automationService.createCampaign(parsed.data as never);
  return NextResponse.json(created,{status:201});
}

