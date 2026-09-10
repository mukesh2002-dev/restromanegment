export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { getKOT, setKOT, updateKOTItem } from "@/lib/kot-store";
import { kotUpdateSchema, kotItemCancelSchema } from "@/lib/validators";
import { getSession } from "@/lib/auth";

const VALID_TRANSITIONS: Record<string,string[]> = {
  NEW: ["ACCEPTED","CANCELLED"],
  ACCEPTED: ["PREPARING","CANCELLED"],
  PREPARING: ["READY","CANCELLED"],
  READY: ["SERVED","COMPLETED","CANCELLED"],
  SERVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function GET(_req: Request, { params }: { params: Promise<{ id:string }> }) {
  const { id } = await params;
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const k = getKOT(id);
    if (!k) return NextResponse.json({ error:"Not found" }, { status:404 });
    return NextResponse.json(k);
  }
  const kot = await prisma.kOT.findUnique({
    where: { id },
    include: { order: { include: { table: true, customer: true } }, items: { include: { menuItem: true } } },
  });
  if (!kot) return NextResponse.json({ error:"Not found" }, { status:404 });
  return NextResponse.json({
    id: kot.id,
    kotNumber: kot.kotNumber,
    orderId: kot.orderId,
    orderNumber: kot.order.orderNumber,
    table: kot.order.table?.number || (kot.order.type as string) || "—",
    tableId: kot.order.tableId,
    customer: kot.order.customer?.name || "Walk-in",
    customerPhone: kot.order.customer?.phone || "—",
    status: kot.status,
    priority: kot.priority,
    notes: kot.notes,
    createdAt: kot.createdAt,
    updatedAt: kot.updatedAt,
    items: kot.items.map((it) => ({ id: it.id, name: it.menuItem.name, menuItemId: it.menuItemId, quantity: it.quantity, notes: it.notes || "", status: it.status })),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id:string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  if (!["OWNER","MANAGER","CHEF","KITCHEN_MANAGER","KITCHEN_STAFF"].includes(session.role)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  const body = await req.json().catch(()=>null);
  // two modes: status update or item cancel via query? We'll support both: if body has itemId => item cancel
  if (body?.itemId && body?.reason) {
    const parsed = kotItemCancelSchema.safeParse({ reason: body.reason });
    if (!parsed.success) return NextResponse.json({ error:"Invalid reason" }, { status:400 });
    const dbOk = await isDbAvailable();
    if (!dbOk) {
      const kot = getKOT(id);
      if (!kot) return NextResponse.json({ error:"Not found" }, { status:404 });
      const item = (kot.items as {id:string; notes:string}[]).find(x=> x.id===body.itemId);
      if (!item) return NextResponse.json({ error:"Item not found" }, { status:404 });
      const updated = updateKOTItem(id, body.itemId, { status:"CANCELLED", notes: `${item.notes || ""} [Cancelled: ${parsed.data.reason}]`.trim() } as never);
      return NextResponse.json(updated);
    }
    try {
      const updated = await prisma.kOTItem.update({ where:{ id: body.itemId }, data:{ status:"CANCELLED", notes: parsed.data.reason } });
      const kot = await prisma.kOT.findUnique({ where:{ id }, include:{ items:true } });
      // if all items cancelled, mark KOT cancelled
      if (kot && kot.items.every(it=> it.status==="CANCELLED")) {
        await prisma.kOT.update({ where:{ id }, data:{ status:"CANCELLED" } });
      }
      return NextResponse.json(updated);
    } catch (e: unknown) { return NextResponse.json({ error: e instanceof Error? e.message:"Error" }, { status:400 }); }
  }
  const parsed = kotUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid status", details: parsed.error.flatten() }, { status:400 });
  const next = parsed.data.status;
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const cur = getKOT(id);
    if (!cur) return NextResponse.json({ error:"Not found" }, { status:404 });
    const allowed = VALID_TRANSITIONS[cur.status] || [];
    if (!allowed.includes(next)) return NextResponse.json({ error:`Invalid transition ${cur.status} â†’ ${next}. Allowed: ${allowed.join(",")||"none"}` }, { status:400 });
    const updated = setKOT(id, { status: next });
    // also cascade to items if moving to ACCEPTED/PREPARING
    if (["ACCEPTED","PREPARING","READY","SERVED","COMPLETED","CANCELLED"].includes(next)) {
      // update all non-cancelled items to same status for demo
      const kot = getKOT(id);
      if (kot) {
        const items = kot.items.map(it=> it.status==="CANCELLED"? it: { ...it, status: next });
        setKOT(id, { items } as never);
        return NextResponse.json(getKOT(id));
      }
    }
    return NextResponse.json(updated);
  }
  const cur = await prisma.kOT.findUnique({ where:{ id } });
  if (!cur) return NextResponse.json({ error:"Not found" }, { status:404 });
  const allowed = VALID_TRANSITIONS[cur.status] || [];
  if (!allowed.includes(next)) return NextResponse.json({ error:`Invalid transition ${cur.status} â†’ ${next}. Allowed: ${allowed.join(",")||"none"}` }, { status:400 });
  const updated = await prisma.kOT.update({ where:{ id }, data:{ status: next as never } });
  // cascade status to items
  await prisma.kOTItem.updateMany({ where:{ kotId: id, status: { not:"CANCELLED" } }, data:{ status: next as never } }).catch(()=>null);
  // also sync order status
  if (next==="ACCEPTED") await prisma.order.update({ where:{ id: cur.orderId }, data:{ status:"CONFIRMED" } }).catch(()=>null);
  if (next==="PREPARING") await prisma.order.update({ where:{ id: cur.orderId }, data:{ status:"PREPARING" } }).catch(()=>null);
  if (next==="READY") await prisma.order.update({ where:{ id: cur.orderId }, data:{ status:"READY" } }).catch(()=>null);
  if (next==="SERVED") await prisma.order.update({ where:{ id: cur.orderId }, data:{ status:"SERVED" } }).catch(()=>null);
  if (next==="COMPLETED") await prisma.order.update({ where:{ id: cur.orderId }, data:{ status:"COMPLETED" } }).catch(()=>null);
  await prisma.auditLog.create({ data:{ staffId: session.staffId, action:"UPDATE_KOT", entity:"KOT", entityId:id, details:{ from: cur.status, to: next } } }).catch(()=>null);
  return NextResponse.json(updated);
}

