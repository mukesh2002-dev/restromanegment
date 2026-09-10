export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { deliveryStatusSchema } from "@/lib/validators";
import { getSession } from "@/lib/auth";

const g = globalThis as unknown as { __deliveryStore?: unknown[] };
function getStore(){ return (g.__deliveryStore as unknown[])||[]; }

const VALID: Record<string,string[]> = {
  PLACED: ["CONFIRMED","CANCELLED","FAILED"],
  PENDING: ["CONFIRMED","ACCEPTED","CANCELLED"],
  CONFIRMED: ["PREPARING","CANCELLED"],
  ACCEPTED: ["PREPARING","CANCELLED"],
  PREPARING: ["READY","CANCELLED"],
  READY: ["OUT_FOR_DELIVERY","CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED","FAILED","CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
};

export async function GET(_req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const list=getStore() as {id:string; orderNumber:string}[];
    const found=list.find(x=> x.id===id || (x as {orderNumber:string}).orderNumber===id);
    if(!found) return NextResponse.json({ error:"Not found"},{status:404});
    return NextResponse.json(found);
  }
  const order=await prisma.deliveryOrder.findUnique({ where:{ id } });
  if(!order){
    const byNumber=await prisma.deliveryOrder.findUnique({ where:{ orderNumber: id } });
    if(!byNumber) return NextResponse.json({ error:"Not found"},{status:404});
    return NextResponse.json(byNumber);
  }
  return NextResponse.json(order);
}

export async function PATCH(req: Request, { params }: { params: Promise<{id:string}>}){
  const { id }=await params;
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER","DELIVERY_MANAGER","CHEF","KITCHEN_MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const parsed=deliveryStatusSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const { status: next, assignedTo, estimatedDeliveryTime }=parsed.data;
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const store=g.__deliveryStore as unknown as {id:string; orderNumber:string; status:string; assignedTo?:string; estimatedDeliveryTime?:string; updatedAt:string}[];
    const idx=store.findIndex(x=> x.id===id || x.orderNumber===id);
    if(idx===-1) return NextResponse.json({ error:"Not found"},{status:404});
    const cur=store[idx];
    const allowed=VALID[cur.status]||[];
    if(next && next!==cur.status && !allowed.includes(next)) return NextResponse.json({ error:`Invalid transition ${cur.status} â†’ ${next}. Allowed: ${allowed.join(",")||"none"}`},{status:400});
    const updated={ ...cur, ...(next?{status:next}:{}), ...(assignedTo!==undefined?{assignedTo: assignedTo||null}:{}), ...(estimatedDeliveryTime?{estimatedDeliveryTime}:{}), updatedAt: new Date().toISOString() } as never;
    store[idx]=updated as never;
    return NextResponse.json(updated);
  }
  const cur=await prisma.deliveryOrder.findUnique({ where:{ id } }) || await prisma.deliveryOrder.findUnique({ where:{ orderNumber: id } });
  if(!cur) return NextResponse.json({ error:"Not found"},{status:404});
  const curId=cur.id;
  if(next && next!==cur.status){
    const allowed=VALID[cur.status]||[];
    if(!allowed.includes(next)) return NextResponse.json({ error:`Invalid transition ${cur.status} â†’ ${next}`},{status:400});
  }
  const data:Record<string,unknown>={};
  if(next) data.status=next;
  if(assignedTo!==undefined) data.assignedTo=assignedTo||null;
  if(estimatedDeliveryTime) data.estimatedDeliveryTime=new Date(estimatedDeliveryTime);
  const updated=await prisma.deliveryOrder.update({ where:{ id: curId }, data: data as never });
  await prisma.auditLog.create({ data:{ staffId: session.staffId, action:"UPDATE_DELIVERY", entity:"DeliveryOrder", entityId: curId, details:{ from: cur.status, to: next, assignedTo } as never } }).catch(()=>null);
  return NextResponse.json(updated);
}

