import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, isDbAvailable } from "@/lib/db";
import { demoTables } from "@/data/demo";
import { tableSchema } from "@/lib/validators";
import { randomBytes } from "crypto";

export async function GET() {
  const dbOk = await isDbAvailable();
  if (!dbOk) return NextResponse.json(demoTables);
  const session = await getSession();
  const tables = await prisma.table.findMany({ where:{ restaurantId: session?.restaurantId || undefined }, orderBy:{ number:"asc" } });
  return NextResponse.json(tables);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  if (!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  const body = await req.json().catch(()=>null);
  const parsed = tableSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten() }, { status:400 });
  const { number, capacity, floor, area, status } = parsed.data;
  const dbOk = await isDbAvailable();
  const qrToken = `qr_table_${Date.now()}_${randomBytes(4).toString("hex")}`;
  if (!dbOk) {
    const created = { id:`table_${Date.now()}`, restaurantId: session.restaurantId, number, capacity, floor, area: area||null, status: status||"AVAILABLE", qrToken, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return NextResponse.json(created, { status:201 });
  }
  try {
    const created = await prisma.table.create({ data:{ restaurantId: session.restaurantId, number, capacity, floor, area, status: status as never, qrToken } });
    return NextResponse.json(created, { status:201 });
  } catch (e: unknown) {
    const msg = e instanceof Error? e.message:"Error";
    if (msg.includes("Unique constraint")) return NextResponse.json({ error:"Table number already exists for this restaurant" }, { status:409 });
    return NextResponse.json({ error: msg }, { status:500 });
  }
}
