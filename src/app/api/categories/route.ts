import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, isDbAvailable } from "@/lib/db";
import { demoCategories, demoMenuItems } from "@/data/demo";
import { categorySchema } from "@/lib/validators";

export async function GET() {
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const cats = demoCategories.map(c=> ({ ...c, _count: { items: demoMenuItems.filter(m=>m.categoryId===c.id).length } }));
    return NextResponse.json(cats);
  }
  const session = await getSession();
  const cats = await prisma.category.findMany({
    where: { restaurantId: session?.restaurantId || undefined },
    include: { _count: { select: { items: true } } },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(cats);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  if (!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  const body = await req.json().catch(()=>null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten() }, { status:400 });
  const { name, slug, description, sortOrder, isActive, imageUrl } = parsed.data;
  const finalSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")).slice(0,40);
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const created = { id: `cat_${Date.now()}`, restaurantId: session.restaurantId, name, slug: finalSlug, description: description||null, sortOrder: sortOrder||0, isActive: isActive??true, imageUrl: imageUrl||null };
    return NextResponse.json(created, { status:201 });
  }
  try {
    const created = await prisma.category.create({
      data: { restaurantId: session.restaurantId, name, slug: finalSlug, description, sortOrder: sortOrder||0, isActive: isActive??true, imageUrl: imageUrl||null },
    });
    await prisma.auditLog.create({ data:{ staffId: session.staffId, action:"CREATE_CATEGORY", entity:"Category", entityId: created.id, details:{ name } } }).catch(()=>null);
    return NextResponse.json(created, { status:201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg.includes("Unique constraint")) return NextResponse.json({ error:"Slug already exists" }, { status:409 });
    return NextResponse.json({ error: msg }, { status:500 });
  }
}
