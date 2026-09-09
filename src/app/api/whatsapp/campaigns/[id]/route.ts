import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{id:string}> }){
  const { id }=await params;
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const { automationService }=await import("@/lib/automation-service");
    const list=await automationService.listCampaigns() as unknown as {id:string}[];
    const found=list.find(c=> c.id===id);
    if(!found) return NextResponse.json({ error:"Not found"},{status:404});
    return NextResponse.json(found);
  }
  const c=await prisma.whatsAppCampaign.findUnique({ where:{ id }, include:{ template:true }});
  if(!c) return NextResponse.json({ error:"Not found"},{status:404});
  return NextResponse.json(c);
}

export async function PATCH(req: Request, { params }: { params: Promise<{id:string}> }){
  const { id }=await params;
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const schema=z.object({ name: z.string().min(2).max(80).optional(), isActive: z.boolean().optional(), scheduledAt: z.string().optional() });
  const parsed=schema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const dbOk=await isDbAvailable();
  if(!dbOk) return NextResponse.json({ id, ...parsed.data, updatedAt: new Date().toISOString()});
  const updated=await prisma.whatsAppCampaign.update({ where:{ id }, data:{
    ...(parsed.data.name?{name:parsed.data.name}:{}),
    ...(parsed.data.isActive!==undefined?{isActive:parsed.data.isActive}:{}),
    ...(parsed.data.scheduledAt?{scheduledAt:new Date(parsed.data.scheduledAt)}:{}),
  }});
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{id:string}> }){
  const { id }=await params;
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const dbOk=await isDbAvailable();
  if(!dbOk) return NextResponse.json({ success:true, demo:true});
  await prisma.whatsAppCampaign.delete({ where:{ id }});
  return NextResponse.json({ success:true});
}
