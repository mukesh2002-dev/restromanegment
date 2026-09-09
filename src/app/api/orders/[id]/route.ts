import { NextResponse } from "next/server";
import { prisma, isDbAvailable } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dbOk = await isDbAvailable();
  if (!dbOk) return NextResponse.json({ error:"DB not configured, use demo list" }, { status:503 });
  const order = await prisma.order.findUnique({ where:{ id }, include:{ items:{ include:{ menuItem:true } }, bill:true, table:true, payments:true } });
  if (!order) return NextResponse.json({ error:"Not found" }, { status:404 });
  return NextResponse.json(order);
}
