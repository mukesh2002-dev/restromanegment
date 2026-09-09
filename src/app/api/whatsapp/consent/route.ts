import { NextResponse } from "next/server";
import { automationService } from "@/lib/automation-service";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export async function POST(req: Request){
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>null);
  const schema=z.object({
    customerId: z.string().min(1),
    whatsappOptIn: z.boolean().optional(),
    smsOptIn: z.boolean().optional(),
    emailOptIn: z.boolean().optional(),
    source: z.string().max(30).optional(),
  });
  const parsed=schema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const res=await automationService.updateConsent(parsed.data.customerId, {
    whatsappOptIn: parsed.data.whatsappOptIn,
    smsOptIn: parsed.data.smsOptIn,
    emailOptIn: parsed.data.emailOptIn,
    source: parsed.data.source,
  } as never);
  return NextResponse.json(res);
}

export async function GET(req: Request){
  const url=new URL(req.url);
  const customerId=url.searchParams.get("customerId");
  if(!customerId) return NextResponse.json({ error:"customerId required"},{status:400});
  const { isDbAvailable, prisma } = await import("@/lib/db");
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const { demoCustomers }=await import("@/data/demo");
    const c=demoCustomers.find(x=> x.id===customerId) as unknown as Record<string,unknown>;
    return NextResponse.json(c? { id:c.id, phone:c.phone, whatsappOptIn: (c as Record<string,unknown>).whatsappOptIn, marketingConsent: c.marketingConsent }: { error:"Not found"});
  }
  const c=await prisma.customer.findUnique({ where:{ id: customerId }, select:{ id:true, phone:true, whatsappOptIn:true, smsOptIn:true, emailOptIn:true, marketingConsent:true, consentTimestamp:true, consentSource:true }});
  return NextResponse.json(c||{ error:"Not found"});
}
