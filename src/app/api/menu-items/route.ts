import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, isDbAvailable } from "@/lib/db";
import { demoMenuItems } from "@/data/demo";
import { menuItemSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categoryId = url.searchParams.get("categoryId");
  const search = url.searchParams.get("search");
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    let items = [...demoMenuItems];
    if (categoryId) items = items.filter(m=>m.categoryId===categoryId);
    if (search) items = items.filter(m=>m.name.toLowerCase().includes(search.toLowerCase()));
    return NextResponse.json(items);
  }
  const session = await getSession();
  const where: Record<string, unknown> = { restaurantId: session?.restaurantId || undefined };
  if (categoryId) where.categoryId = categoryId;
  if (search) where.name = { contains: search, mode:"insensitive" };
  const items = await prisma.menuItem.findMany({ where, include:{ variants:true, addOns:true, category:true }, orderBy:{ name:"asc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  if (!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  const body = await req.json().catch(()=>null);
  const parsed = menuItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten() }, { status:400 });
  const { categoryId, name, description, price, taxPercent, isVeg, isAvailable, imageUrl, servingUnit, sku, prepTimeMin, variants, addOns } = parsed.data;
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const created = { id:`mi_${Date.now()}`, restaurantId: session.restaurantId, categoryId, name, description:description||null, price, taxPercent:taxPercent??5, isVeg:isVeg??true, isAvailable:isAvailable??true, imageUrl:imageUrl||null, servingUnit: servingUnit||"PLATE", sku:sku||null, prepTimeMin:prepTimeMin||15, variants: variants?.map(v=>({ id:`var_${Date.now()}_${Math.random()}`, ...v }))||[], addOns: addOns?.map(a=>({ id:`addon_${Date.now()}_${Math.random()}`, ...a }))||[] };
    return NextResponse.json(created, { status:201 });
  }
  try {
    const created = await prisma.menuItem.create({
      data:{
        restaurantId: session.restaurantId,
        categoryId, name, description, price, taxPercent: taxPercent??5, isVeg:isVeg??true, isAvailable:isAvailable??true, imageUrl: imageUrl||null, servingUnit: servingUnit as never || "PLATE", sku: sku||null, prepTimeMin: prepTimeMin||15,
        variants: variants? { create: variants.map(v=>({ name:v.name, priceDelta:v.priceDelta })) } : undefined,
        addOns: addOns? { create: addOns.map(a=>({ name:a.name, price:a.price })) } : undefined,
      },
      include:{ variants:true, addOns:true },
    });
    return NextResponse.json(created, { status:201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error? e.message:"Error" }, { status:500 });
  }
}
