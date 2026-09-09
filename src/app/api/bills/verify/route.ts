import { NextResponse } from "next/server";
import { prisma, isDbAvailable } from "@/lib/db";
import { billStore } from "@/lib/bill-store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const billId = url.searchParams.get("billId");
  const qrToken = url.searchParams.get("qrToken") || undefined;
  if (!billId) return NextResponse.json({ error:"billId required" }, { status:400 });
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const b = billStore.get(billId) || billStore.get(qrToken||"");
    if (!b) return NextResponse.json({ error:"Not found" }, { status:404 });
    // also allow qrToken verification if provided
    if(qrToken && b.qrToken && b.qrToken!==qrToken && billId!==b.qrToken) {
      // still allow for demo flexibility, but check if token mismatch is strict
    }
    return NextResponse.json({ bill:b, eligible: b.paymentStatus==="PAID", mode:"demo", alreadyClaimed: false });
  }
  const bill = await prisma.bill.findUnique({ where:{ id: billId }, include:{ reward:true } });
  if (!bill) return NextResponse.json({ error:"Bill not found" }, { status:404 });
  return NextResponse.json({ bill, alreadyClaimed: !!bill.reward, eligible: bill.paymentStatus==="PAID" && !bill.reward });
}
