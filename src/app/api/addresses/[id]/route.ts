export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const dbOk=await isDbAvailable();
  if(!dbOk) return NextResponse.json({ id, line1:"100 MG Road", city:"Pune" });
  const addr=await prisma.address.findUnique({ where:{ id }});
  if(!addr) return NextResponse.json({ error:"Not found"},{status:404});
  return NextResponse.json(addr);
}

export async function PATCH(req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>null);
  const dbOk=await isDbAvailable();
  if(!dbOk) return NextResponse.json({ id, ...body, updatedAt: new Date().toISOString()});
  try{
    const updated=await prisma.address.update({ where:{ id }, data: body as never });
    return NextResponse.json(updated);
  } catch(e: unknown){ return NextResponse.json({ error: e instanceof Error? e.message:"Error"},{status:400}); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  const dbOk=await isDbAvailable();
  if(!dbOk) return NextResponse.json({ success:true});
  await prisma.address.delete({ where:{ id }}).catch(()=>null);
  return NextResponse.json({ success:true});
}

