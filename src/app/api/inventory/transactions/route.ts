import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { inventoryService } from "@/lib/inventory-service";
import { stockTransactionSchema } from "@/lib/validators";
import { getSession } from "@/lib/auth";

export async function GET(req: Request){
  const url=new URL(req.url);
  const itemId=url.searchParams.get("itemId")||undefined;
  const type=url.searchParams.get("type")||undefined;
  const take=Math.min(Number(url.searchParams.get("take")||"50"),100);
  const dbOk=await isDbAvailable();
  if(!dbOk){
    let list=inventoryService.listTransactions(itemId);
    if(type && type!=="ALL") list=list.filter(t=> t.type===type);
    return NextResponse.json(list.slice(0,take));
  }
  const where:Record<string,unknown>={};
  if(itemId) (where as Record<string,unknown>).inventoryItemId=itemId;
  if(type && type!=="ALL") (where as Record<string,unknown>).type=type;
  const txs=await prisma.stockTransaction.findMany({ where: where as never, orderBy:{ createdAt:"desc"}, take, include:{ inventoryItem:true } });
  return NextResponse.json(txs);
}

export async function POST(req: Request){
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER","CHEF","KITCHEN_MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const parsed=stockTransactionSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const tx=inventoryService.createTransaction({
      inventoryItemId: parsed.data.inventoryItemId,
      type: parsed.data.type as never,
      quantity: parsed.data.quantity,
      unitCost: parsed.data.unitCost,
      reference: parsed.data.reference,
      createdById: session.staffId,
    } as never);
    return NextResponse.json(tx,{status:201});
  }
  // validate item belongs to restaurant
  const item=await prisma.inventoryItem.findUnique({ where:{ id: parsed.data.inventoryItemId } });
  if(!item) return NextResponse.json({ error:"Item not found"},{status:404});
  if(item.restaurantId!==session.restaurantId) return NextResponse.json({ error:"Item belongs to different restaurant"},{status:403});
  // prevent negative stock for consumption/waste unless adjustment
  if(["CONSUMPTION","WASTE","TRANSFER"].includes(parsed.data.type) && item.currentStock + parsed.data.quantity < 0){
    return NextResponse.json({ error:`Insufficient stock (${item.currentStock}) for ${parsed.data.quantity}`},{status:400});
  }
  const tx=await prisma.stockTransaction.create({
    data:{
      inventoryItemId: parsed.data.inventoryItemId,
      type: parsed.data.type as never,
      quantity: parsed.data.quantity,
      unitCost: parsed.data.unitCost,
      reference: parsed.data.reference,
      createdById: session.staffId,
    }
  });
  // apply stock change
  await prisma.inventoryItem.update({ where:{ id: item.id }, data:{ currentStock: { increment: parsed.data.quantity } } });
  await prisma.auditLog.create({ data:{ staffId: session.staffId, action:`STOCK_${parsed.data.type}`, entity:"StockTransaction", entityId: tx.id, details: { itemId: item.id, quantity: parsed.data.quantity } as never } }).catch(()=>null);
  const updated=await prisma.inventoryItem.findUnique({ where:{ id: item.id } });
  return NextResponse.json({ transaction: tx, item: updated },{status:201});
}
