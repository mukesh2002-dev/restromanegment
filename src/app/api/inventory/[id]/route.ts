export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { inventoryService } from "@/lib/inventory-service";
import { inventoryItemSchema } from "@/lib/validators";
import { getSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const it=inventoryService.getItem(id);
    if(!it) return NextResponse.json({ error:"Not found"},{status:404});
    return NextResponse.json(it);
  }
  const it=await prisma.inventoryItem.findUnique({ where:{ id }, include:{ supplier:true, transactions:{ orderBy:{ createdAt:"desc"}, take:20 } } });
  if(!it) return NextResponse.json({ error:"Not found"},{status:404});
  return NextResponse.json(it);
}

export async function PATCH(req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const parsed=inventoryItemSchema.partial().safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const updated=inventoryService.updateItem(id, {
      name: parsed.data.name,
      category: parsed.data.category as never,
      unit: parsed.data.unit as never,
      currentStock: parsed.data.currentStock,
      reorderLevel: parsed.data.reorderLevel,
      costPerUnit: parsed.data.costPerUnit,
      supplierId: parsed.data.supplierId as unknown as string,
      batchNumber: parsed.data.batchNumber as unknown as string,
      expiryDate: parsed.data.expiryDate? new Date(parsed.data.expiryDate).toISOString(): undefined,
    } as never);
    if(!updated) return NextResponse.json({ error:"Not found"},{status:404});
    return NextResponse.json(updated);
  }
  try{
    const data: Record<string,unknown>={};
    if(parsed.data.name!==undefined) data.name=parsed.data.name;
    if(parsed.data.category!==undefined) data.category=parsed.data.category;
    if(parsed.data.unit!==undefined) data.unit=parsed.data.unit;
    if(parsed.data.currentStock!==undefined) data.currentStock=parsed.data.currentStock;
    if(parsed.data.reorderLevel!==undefined) data.reorderLevel=parsed.data.reorderLevel;
    if(parsed.data.costPerUnit!==undefined) data.costPerUnit=parsed.data.costPerUnit;
    if(parsed.data.supplierId!==undefined) data.supplierId=parsed.data.supplierId||null;
    if(parsed.data.batchNumber!==undefined) data.batchNumber=parsed.data.batchNumber||null;
    if(parsed.data.expiryDate!==undefined) data.expiryDate=parsed.data.expiryDate? new Date(parsed.data.expiryDate): null;
    const updated=await prisma.inventoryItem.update({ where:{ id }, data: data as never });
    return NextResponse.json(updated);
  } catch(e: unknown){ return NextResponse.json({ error: e instanceof Error? e.message:"Error"},{status:400}); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const ok=inventoryService.deleteItem(id);
    if(!ok) return NextResponse.json({ error:"Not found"},{status:404});
    return NextResponse.json({ success:true});
  }
  try{ await prisma.inventoryItem.delete({ where:{ id } }); return NextResponse.json({ success:true}); } catch(e: unknown){ return NextResponse.json({ error: e instanceof Error? e.message:"Error"},{status:400}); }
}

