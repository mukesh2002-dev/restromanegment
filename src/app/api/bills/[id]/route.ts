export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { prisma, isDbAvailable } from "@/lib/db";
import { demoBills } from "@/data/demo";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const b = demoBills.find(x=> x.id===id || x.billNumber===id);
    if (!b) return NextResponse.json({ error:"Not found" }, { status:404 });
    return NextResponse.json({ ...b, payments:[{ method:"CASH", amount:b.totalAmount, status:"PAID" }], order:{ orderNumber: b.orderNumber, id: b.orderId } });
  }
  const bill = await prisma.bill.findUnique({ where:{ id }, include:{ order:{ include:{ items:{ include:{ menuItem:true } }, table:true } }, payments:true, customer:true } });
  if (!bill) {
    // try by billNumber
    const byNumber = await prisma.bill.findUnique({ where:{ billNumber: id }, include:{ order:{ include:{ items:{ include:{ menuItem:true } } } }, payments:true, customer:true } });
    if (!byNumber) return NextResponse.json({ error:"Bill not found" }, { status:404 });
    return NextResponse.json(byNumber);
  }
  return NextResponse.json(bill);
}

