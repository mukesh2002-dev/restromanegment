export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, isDbAvailable } from "@/lib/db";
import { tableSchema } from "@/lib/validators";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  if (!["OWNER","MANAGER","WAITER"].includes(session.role)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  const body = await req.json().catch(()=>null);
  const parsed = tableSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten() }, { status:400 });
  const dbOk = await isDbAvailable();
  if (!dbOk) return NextResponse.json({ id, ...parsed.data, updatedAt: new Date().toISOString() });
  // FSM validation (Â§10)
  if (parsed.data.status) {
    const current = await prisma.table.findUnique({ where:{ id } });
    if (!current) return NextResponse.json({ error:"Table not found" }, { status:404 });
    const validTransitions: Record<string,string[]> = {
      AVAILABLE: ["OCCUPIED","RESERVED","CLEANING"],
      OCCUPIED: ["BILLING","AVAILABLE","CLEANING"],
      RESERVED: ["OCCUPIED","AVAILABLE","CANCELLED"],
      BILLING: ["CLEANING","AVAILABLE"],
      CLEANING: ["AVAILABLE"],
    };
    const allowed = validTransitions[current.status] || [];
    if (current.status !== parsed.data.status && !allowed.includes(parsed.data.status as string)) {
      return NextResponse.json({ error:`Invalid transition ${current.status} â†’ ${parsed.data.status}. Allowed: ${allowed.join(", ")||"none"}`, code:"INVALID_TRANSITION" }, { status:400 });
    }
  }
  try {
    const updated = await prisma.table.update({ where:{ id }, data: parsed.data as never });
    await prisma.auditLog.create({ data:{ staffId: session.staffId, action:"UPDATE_TABLE", entity:"Table", entityId: id, details: parsed.data } }).catch(()=>null);
    return NextResponse.json(updated);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error? e.message:"Error" }, { status:404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  if (!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  const dbOk = await isDbAvailable();
  if (!dbOk) return NextResponse.json({ success:true, demo:true });
  try {
    await prisma.table.delete({ where:{ id } });
    return NextResponse.json({ success:true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error? e.message:"Error" }, { status:400 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dbOk = await isDbAvailable();
  if (!dbOk) return NextResponse.json({ error:"DB not configured" }, { status:503 });
  const t = await prisma.table.findUnique({ where:{ id } });
  if (!t) return NextResponse.json({ error:"Not found" }, { status:404 });
  return NextResponse.json(t);
}

