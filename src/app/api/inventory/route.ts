import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { inventoryService } from "@/lib/inventory-service";
import { inventoryItemSchema } from "@/lib/validators";
import { getSession } from "@/lib/auth";

export async function GET(req: Request){
  const url=new URL(req.url);
  const category=url.searchParams.get("category")||undefined;
  const q=url.searchParams.get("q")||undefined;
  const low=url.searchParams.get("low")==="1";
  const nearExpiry=url.searchParams.get("nearExpiry")==="1";
  const take=Math.min(Number(url.searchParams.get("take")||"50"),100);
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const list=await inventoryService.listItems({ category, q, lowStock: low||undefined, nearExpiry: nearExpiry||undefined });
    return NextResponse.json((list||[]).slice(0,take));
  }
  const session=await getSession();
  const where:Record<string,unknown>={ restaurantId: session?.restaurantId };
  if(category && category!=="ALL") (where as Record<string,unknown>).category=category;
  if(q) (where as Record<string,unknown>).OR=[{ name:{ contains:q, mode:"insensitive"}},{ sku:{ contains:q, mode:"insensitive"}}];
  if(low) (where as Record<string,unknown>).currentStock={ lt: prisma.inventoryItem.fields.reorderLevel as unknown as number } as unknown as never;
  // we handle low/nearExpiry post-filter for simplicity with Prisma
  let items=await prisma.inventoryItem.findMany({ where: where as never, include:{ supplier:true }, orderBy:{ name:"asc"}, take: low||nearExpiry? 200 : take });
  if(low) items=items.filter(i=> i.currentStock < i.reorderLevel);
  if(nearExpiry){
    const threshold=Date.now()+14*86400000;
    items=items.filter(i=> i.expiryDate && new Date(i.expiryDate).getTime() < threshold && new Date(i.expiryDate).getTime() > Date.now());
  }
  if(low||nearExpiry) items=items.slice(0,take);
  return NextResponse.json(items);
}

export async function POST(req: Request){
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const parsed=inventoryItemSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const created=inventoryService.createItem({
      id: undefined as unknown as string,
      sku: parsed.data.sku||undefined,
      name: parsed.data.name,
      category: parsed.data.category as never,
      unit: parsed.data.unit as never,
      currentStock: parsed.data.currentStock??0,
      reorderLevel: parsed.data.reorderLevel??10,
      costPerUnit: parsed.data.costPerUnit??0,
      supplierId: parsed.data.supplierId||null,
      batchNumber: parsed.data.batchNumber||null,
      expiryDate: parsed.data.expiryDate? new Date(parsed.data.expiryDate).toISOString(): null,
    } as never);
    return NextResponse.json(created,{status:201});
  }
  try{
    const created=await prisma.inventoryItem.create({
      data:{
        restaurantId: session.restaurantId,
        sku: parsed.data.sku||`SKU-${Date.now()}`,
        name: parsed.data.name,
        category: parsed.data.category as never,
        unit: parsed.data.unit as never,
        currentStock: parsed.data.currentStock??0,
        reorderLevel: parsed.data.reorderLevel??10,
        costPerUnit: parsed.data.costPerUnit??0,
        supplierId: parsed.data.supplierId||null,
        batchNumber: parsed.data.batchNumber||null,
        expiryDate: parsed.data.expiryDate? new Date(parsed.data.expiryDate): null,
      }
    });
    await prisma.auditLog.create({ data:{ staffId: session.staffId, action:"CREATE_INVENTORY", entity:"InventoryItem", entityId: created.id, details: { name: parsed.data.name } as never } }).catch(()=>null);
    return NextResponse.json(created,{status:201});
  } catch(e: unknown){
    const msg=e instanceof Error? e.message:"Error";
    if(msg.includes("Unique")) return NextResponse.json({ error:"SKU already exists"},{status:409});
    return NextResponse.json({ error:msg},{status:500});
  }
}
