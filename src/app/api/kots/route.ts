import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { listKOTs, addKOT } from "@/lib/kot-store";
import { kotCreateSchema } from "@/lib/validators";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    let kots = listKOTs();
    if (status && status!=="ALL") kots = kots.filter(k=> k.status===status);
    if (priority !== null && priority !== "" && priority!=="ALL") kots = kots.filter(k=> String(k.priority)===priority);
    return NextResponse.json(kots);
  }
  const where: Record<string, unknown> = {};
  if (status && status!=="ALL") where.status = status;
  if (priority && priority!=="ALL") where.priority = Number(priority);
  // scope to restaurant via order — with stale JWT fallback
  const session = await getSession();
  let restaurantId: string | undefined = session?.restaurantId || undefined;
  if (session?.restaurantId) {
    const { getEffectiveRestaurantId } = await import("@/lib/db");
    restaurantId = (await getEffectiveRestaurantId(session.restaurantId)) || undefined;
  } else {
    const { getEffectiveRestaurantId } = await import("@/lib/db");
    restaurantId = (await getEffectiveRestaurantId(null)) || undefined;
  }
  const kots = await prisma.kOT.findMany({
    where: {
      ...where,
      ...(restaurantId ? { order: { restaurantId } } : {}),
    },
    include:{ order:{ include:{ table:true, customer:true } }, items:{ include:{ menuItem:true } } },
    orderBy:{ createdAt:"desc" },
    take: 100,
  });
  // if filtered restaurant empty but DB has KOTs, fallback (stale JWT)
  if (kots.length===0 && restaurantId) {
    const fallback = await prisma.kOT.findMany({ where, include:{ order:{ include:{ table:true, customer:true } }, items:{ include:{ menuItem:true } } }, orderBy:{ createdAt:"desc" }, take:100 });
    if (fallback.length) {
      const mappedFb = fallback.map(k=> ({
        id: k.id, kotNumber: k.kotNumber, orderId: k.orderId, orderNumber: k.order.orderNumber,
        table: k.order.table?.number || (k.order.type==="TAKEAWAY"?"Takeaway": k.order.type==="DELIVERY"?"Delivery":"—"),
        tableId: k.order.tableId, customer: k.order.customer?.name || "Walk-in", customerPhone: k.order.customer?.phone || "—",
        status: k.status, priority: k.priority, notes: k.notes, createdAt: k.createdAt, updatedAt: k.updatedAt,
        items: k.items.map(it=> ({ id: it.id, name: it.menuItem.name, menuItemId: it.menuItemId, quantity: it.quantity, notes: it.notes||"", status: it.status })),
      }));
      return NextResponse.json(mappedFb);
    }
  }
  // map to UI shape
  const mapped = kots.map(k=> ({
    id: k.id,
    kotNumber: k.kotNumber,
    orderId: k.orderId,
    orderNumber: k.order.orderNumber,
    table: k.order.table?.number || (k.order.type==="TAKEAWAY"?"Takeaway": k.order.type==="DELIVERY"?"Delivery":"—"),
    tableId: k.order.tableId,
    customer: k.order.customer?.name || "Walk-in",
    customerPhone: k.order.customer?.phone || "—",
    status: k.status,
    priority: k.priority,
    notes: k.notes,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
    items: k.items.map(it=> ({ id: it.id, name: it.menuItem.name, menuItemId: it.menuItemId, quantity: it.quantity, notes: it.notes||"", status: it.status })),
  }));
  return NextResponse.json(mapped);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const body = await req.json().catch(()=>null);
  const parsed = kotCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten() }, { status:400 });
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const id = `kot_${Date.now()}`;
    const kotNumber = `KOT-2026-${String(Date.now()).slice(-6)}`;
    const kot = {
      id, kotNumber, orderId: parsed.data.orderId, orderNumber: `ORD-2026-${id.slice(-4)}`,
      table: "T-01", customer:"Demo", customerPhone:"—", status:"NEW", priority: parsed.data.priority||0, notes: parsed.data.notes, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      items: [],
    } as never;
    addKOT(kot as never);
    return NextResponse.json(kot, { status:201 });
  }
  // real DB path: verify order exists
  const order = await prisma.order.findUnique({ where:{ id: parsed.data.orderId }, include:{ items:true } });
  if (!order) return NextResponse.json({ error:"Order not found" }, { status:404 });
  const kotNumber = `KOT-2026-${String(Date.now()).slice(-6)}${String(Math.floor(Math.random()*90+10))}`;
  const kot = await prisma.kOT.create({
    data:{
      kotNumber, orderId: order.id, status:"NEW", priority: parsed.data.priority||0, notes: parsed.data.notes,
      items:{ create: order.items.map(oi=> ({ menuItemId: oi.menuItemId, quantity: oi.quantity, notes: oi.notes, status:"NEW" })) },
    },
    include:{ items:true },
  });
  return NextResponse.json(kot, { status:201 });
}
