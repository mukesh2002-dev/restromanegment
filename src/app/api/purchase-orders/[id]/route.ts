import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { inventoryService } from "@/lib/inventory-service";
import { purchaseOrderStatusSchema } from "@/lib/validators";
import { getSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const po=inventoryService.getPO(id);
    if(!po) return NextResponse.json({ error:"Not found"},{status:404});
    return NextResponse.json(po);
  }
  const po=await prisma.purchaseOrder.findUnique({ where:{ id }, include:{ supplier:true, items:true } });
  if(!po) return NextResponse.json({ error:"Not found"},{status:404});
  return NextResponse.json(po);
}

export async function PATCH(req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const parsed=purchaseOrderStatusSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const updated=inventoryService.updatePOStatus(id, parsed.data.status);
    if(!updated) return NextResponse.json({ error:"Not found"},{status:404});
    return NextResponse.json(updated);
  }
  const cur=await prisma.purchaseOrder.findUnique({ where:{ id }, include:{ items:true } });
  if(!cur) return NextResponse.json({ error:"Not found"},{status:404});
  const next=parsed.data.status;
  // simple state machine: DRAFT->ORDERED->RECEIVED->INVOICED, any ->CANCELLED
  const allowed:Record<string,string[]>={ DRAFT:["ORDERED","CANCELLED"], ORDERED:["RECEIVED","CANCELLED"], RECEIVED:["INVOICED"], INVOICED:[], CANCELLED:[] };
  if(next!=="CANCELLED" && !allowed[cur.status]?.includes(next) && cur.status!==next){
    return NextResponse.json({ error:`Invalid transition ${cur.status} → ${next}`},{status:400});
  }
  const data: Record<string,unknown>={ status: next };
  if(next==="ORDERED") data.orderedAt=new Date();
  if(next==="RECEIVED"){
    data.receivedAt=new Date();
    // create stock transactions for each item (goods received)
    for(const it of cur.items){
      await prisma.stockTransaction.create({ data:{ inventoryItemId: it.inventoryItemId, type:"PURCHASE", quantity: it.quantity, unitCost: it.unitCost, reference: cur.poNumber, createdById: session.staffId } });
      await prisma.inventoryItem.update({ where:{ id: it.inventoryItemId }, data:{ currentStock:{ increment: it.quantity } } });
    }
  }
  const updated=await prisma.purchaseOrder.update({ where:{ id }, data: data as never, include:{ items:true, supplier:true } });
  return NextResponse.json(updated);
}
