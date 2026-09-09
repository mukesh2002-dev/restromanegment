import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, isDbAvailable } from "@/lib/db";
import { categorySchema } from "@/lib/validators";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  if (!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  const body = await req.json().catch(()=>null);
  const parsed = categorySchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten() }, { status:400 });
  const dbOk = await isDbAvailable();
  if (!dbOk) return NextResponse.json({ id, ...parsed.data, updatedAt: new Date().toISOString() });
  try {
    const updated = await prisma.category.update({ where:{ id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error? e.message:"Not found" }, { status:404 });
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
    await prisma.category.delete({ where:{ id } });
    return NextResponse.json({ success:true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error? e.message:"Error" }, { status:400 });
  }
}
