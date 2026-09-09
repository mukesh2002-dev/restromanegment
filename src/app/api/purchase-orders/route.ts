import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { inventoryService } from "@/lib/inventory-service";
import { purchaseOrderSchema } from "@/lib/validators";
import { getSession } from "@/lib/auth";

export async function GET(req: Request){
  const url=new URL(req.url);
  const status=url.searchParams.get("status")||undefined;
  const take=Math.min(Number(url.searchParams.get("take")||"20"),100);
  const dbOk=await isDbAvailable();
  if(!dbOk){
    let list=inventoryService.listPOs();
    if(status && status!=="ALL") list=list.filter(p=> p.status===status);
    return NextResponse.json(list.slice(0,take));
  }
  const session=await getSession();
  const where:Record<string,unknown>={};
  if(status && status!=="ALL") (where as Record<string,unknown>).status=status;
  // we don't have restaurantId on PO directly? use supplier restaurant
  const pos=await prisma.purchaseOrder.findMany({ where: where as never, orderBy:{ createdAt:"desc"}, take, include:{ supplier:true, items:true } });
  // filter by restaurant via supplier if session exists
  const filtered= session? pos.filter(p=> (p as unknown as {supplier:{restaurantId:string}}).supplier.restaurantId===session.restaurantId) : pos;
  return NextResponse.json(filtered);
}

export async function POST(req: Request){
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const parsed=purchaseOrderSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const items=parsed.data.items.map(i=> ({ ...i, totalCost: i.quantity*i.unitCost }));
    const po=inventoryService.createPO({ supplierId: parsed.data.supplierId, notes: parsed.data.notes, items });
    return NextResponse.json(po,{status:201});
  }
  // validate supplier belongs to restaurant
  const sup=await prisma.supplier.findUnique({ where:{ id: parsed.data.supplierId } });
  if(!sup) return NextResponse.json({ error:"Supplier not found"},{status:404});
  if(sup.restaurantId!==session.restaurantId) return NextResponse.json({ error:"Supplier mismatch"},{status:403});
  const poNumber=`PO-2026-${String(Date.now()).slice(-6)}${String(Math.floor(Math.random()*90+10))}`;
  const totalAmount=parsed.data.items.reduce((a,i)=>a+i.quantity*i.unitCost,0);
  const po=await prisma.purchaseOrder.create({
    data:{
      restaurantId: session.restaurantId,
      supplierId: parsed.data.supplierId,
      poNumber,
      status:"DRAFT",
      totalAmount,
      notes: parsed.data.notes,
      items:{ create: parsed.data.items.map(i=> ({ inventoryItemId: i.inventoryItemId, quantity: i.quantity, unitCost: i.unitCost, totalCost: i.quantity*i.unitCost })) },
    },
    include:{ items:true, supplier:true }
  });
  return NextResponse.json(po,{status:201});
}
