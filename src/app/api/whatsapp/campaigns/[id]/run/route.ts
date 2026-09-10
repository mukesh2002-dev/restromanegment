export const dynamic = 'force-dynamic';
export const revalidate = 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { automationService } from "@/lib/automation-service";
import { sendWhatsApp, renderTemplate } from "@/lib/whatsapp";

export async function POST(_req: Request, { params }: { params: Promise<{id:string}> }){
  const { id }=await params;
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const dbOk=await isDbAvailable();
  // special case: birthday campaign uses dedicated runner
  if(id.includes("bday") || id==="camp_bday"){
    const res=await automationService.runBirthdayCampaign(id);
    return NextResponse.json(res);
  }
  // generic campaign runner: find campaign, render template for audience, send with consent check
  let campaign: any = null;
  if(!dbOk){
    const list=await automationService.listCampaigns() as any[];
    campaign=list.find((c:any)=> c.id===id) || null;
  } else {
    campaign=await prisma.whatsAppCampaign.findUnique({ where:{ id }, include:{ template:true }}) as any;
  }
  if(!campaign) return NextResponse.json({ error:"Campaign not found"},{status:404});
  if(!campaign.isActive) return NextResponse.json({ error:"Campaign inactive"},{status:400});
  // For demo, send to 3 sample customers with consent
  const customers = dbOk? await prisma.customer.findMany({ where:{ whatsappOptIn:true }, take:5 }) : (await import("@/data/demo")).demoCustomers.filter((c:unknown)=>(c as {whatsappOptIn?:boolean; marketingConsent:boolean}).whatsappOptIn || (c as {marketingConsent:boolean}).marketingConsent).slice(0,3) as unknown as {id:string; name:string; phone:string}[];
  let sent=0;
  for(const cust of customers as unknown as {id:string; name:string; phone:string}[]){
    const content=campaign.template?.content || "Hello {{name}}! Offer for you.";
    const message=renderTemplate(content, { name: cust.name, restaurant: "Spice Garden", coupon: `WA-${Date.now().toString(36).slice(0,4)}`, value: `₹${campaign.couponValue||100}`, expiry: new Date(Date.now()+7*86400000).toLocaleDateString() });
    const res=await sendWhatsApp({ to: cust.phone, message, event: campaign.event as never });
    if(dbOk){
      await prisma.whatsAppLog.create({ data:{ toPhone: cust.phone, message, status: res.success?"SENT":"FAILED", event: campaign.event as never, templateId: campaign.templateId, campaignId: campaign.id, providerId: res.providerId } as never }).catch(()=>null);
    }
    sent++;
  }
  if(dbOk) await prisma.whatsAppCampaign.update({ where:{ id }, data:{ lastRunAt: new Date() }}).catch(()=>null);
  return NextResponse.json({ sent, campaign: campaign.id });
}

