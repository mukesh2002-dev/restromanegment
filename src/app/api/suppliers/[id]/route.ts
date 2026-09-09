import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { supplierSchema } from "@/lib/validators";

export async function GET(_req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const { inventoryService }=await import("@/lib/inventory-service");
    const s=inventoryService.getSupplier(id);
    if(!s) return NextResponse.json({ error:"Not found"},{status:404});
    return NextResponse.json(s);
  }
  const s=await prisma.supplier.findUnique({ where:{ id } });
  if(!s) return NextResponse.json({ error:"Not found"},{status:404});
  return NextResponse.json(s);
}

export async function PATCH(req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const parsed=supplierSchema.partial().safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const dbOk=await isDbAvailable();
  if(!dbOk) return NextResponse.json({ id, ...parsed.data, updatedAt: new Date().toISOString()});
  try{
    const updated=await prisma.supplier.update({ where:{ id }, data: parsed.data as never });
    return NextResponse.json(updated);
  } catch(e: unknown){ return NextResponse.json({ error: e instanceof Error? e.message:"Error"},{status:400}); }
}
