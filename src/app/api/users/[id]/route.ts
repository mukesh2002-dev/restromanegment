export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const patchSchema=z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().max(20).optional(),
  role: z.enum(["OWNER","MANAGER","CASHIER","WAITER","KITCHEN_STAFF","KITCHEN_MANAGER","CHEF","DELIVERY_MANAGER"]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  const dbOk=await isDbAvailable();
  if(!dbOk) return NextResponse.json({ id, name:"Demo Staff", email:`${id}@demo.in`, role:"WAITER"});
  const user=await prisma.staff.findUnique({ where:{ id }, select:{ id:true, name:true, email:true, phone:true, role:true, isActive:true }});
  if(!user) return NextResponse.json({ error:"Not found"},{status:404});
  return NextResponse.json(user);
}

export async function PATCH(req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const parsed=patchSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const dbOk=await isDbAvailable();
  if(!dbOk) return NextResponse.json({ id, ...parsed.data, updatedAt: new Date().toISOString()});
  try{
    const updated=await prisma.staff.update({ where:{ id }, data: parsed.data as never });
    await prisma.auditLog.create({ data:{ staffId: session.staffId, action:"UPDATE_USER", entity:"Staff", entityId: id, details: parsed.data as never }}).catch(()=>null);
    return NextResponse.json(updated);
  } catch(e: unknown){ return NextResponse.json({ error: e instanceof Error? e.message:"Error"},{status:400}); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(session.role!=="OWNER") return NextResponse.json({ error:"Owner only"},{status:403});
  const dbOk=await isDbAvailable();
  if(!dbOk) return NextResponse.json({ success:true, demo:true});
  try{ await prisma.staff.delete({ where:{ id }}); return NextResponse.json({ success:true}); } catch(e: unknown){ return NextResponse.json({ error: e instanceof Error? e.message:"Error"},{status:400}); }
}

