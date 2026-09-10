export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, isDbAvailable } from "@/lib/db";
import { menuItemSchema } from "@/lib/validators";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dbOk = await isDbAvailable();
  if (!dbOk) return NextResponse.json({ error:"DB not configured, use demo list" }, { status:503 });
  const item = await prisma.menuItem.findUnique({ where:{ id }, include:{ variants:true, addOns:true, category:true } });
  if (!item) return NextResponse.json({ error:"Not found" }, { status:404 });
  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  if (!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  const body = await req.json().catch(()=>null);
  const parsed = menuItemSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten() }, { status:400 });
  const dbOk = await isDbAvailable();
  if (!dbOk) return NextResponse.json({ id, ...parsed.data, updatedAt: new Date().toISOString() });
  const { variants, addOns, ...data } = parsed.data as Record<string, unknown> & { variants?: unknown; addOns?: unknown };
  try {
    const updated = await prisma.menuItem.update({ where:{ id }, data: data as never, include:{ variants:true, addOns:true } });
    // handle variants/addOns replacement if provided
    if (Array.isArray(variants)) {
      await prisma.menuVariant.deleteMany({ where:{ menuItemId: id } });
      for (const v of variants as {name:string; priceDelta:number}[]) {
        await prisma.menuVariant.create({ data:{ menuItemId: id, name: v.name, priceDelta: v.priceDelta } });
      }
    }
    if (Array.isArray(addOns)) {
      await prisma.menuAddOn.deleteMany({ where:{ menuItemId: id } });
      for (const a of addOns as {name:string; price:number}[]) {
        await prisma.menuAddOn.create({ data:{ menuItemId: id, name: a.name, price: a.price } });
      }
    }
    const final = await prisma.menuItem.findUnique({ where:{ id }, include:{ variants:true, addOns:true } });
    return NextResponse.json(final ?? updated);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error? e.message:"Error" }, { status:400 });
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
    await prisma.menuItem.delete({ where:{ id } });
    return NextResponse.json({ success:true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error? e.message:"Error" }, { status:400 });
  }
}

