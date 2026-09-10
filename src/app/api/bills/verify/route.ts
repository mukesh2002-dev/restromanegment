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
    const found = billStore.get(billId) || (qrToken ? billStore.get(qrToken) : null);
    if (!found) return NextResponse.json({ error:"Bill not found — demo: try bill_0001 or fresh POS bill (demo id/billNumber/qrToken all work)" }, { status:404 });
    return NextResponse.json({ bill:found, eligible: found.paymentStatus==="PAID", mode:"demo", alreadyClaimed: false });
  }
  // DB: try id, billNumber, qrToken (fixes BILL-2026-... as billId)
  let bill = await prisma.bill.findUnique({ where:{ id: billId }, include:{ reward:true } });
  if (!bill) bill = await prisma.bill.findUnique({ where:{ billNumber: billId }, include:{ reward:true } }) as any;
  if (!bill && qrToken) bill = await prisma.bill.findUnique({ where:{ qrToken: qrToken }, include:{ reward:true } }) as any;
  if (!bill && billId) bill = await prisma.bill.findUnique({ where:{ qrToken: billId }, include:{ reward:true } }) as any;
  // also try qrToken as billNumber fallback
  if (!bill) {
    const alt = await prisma.bill.findFirst({ where:{ OR:[{ billNumber: billId }, { qrToken: billId }, { qrToken: qrToken||"" }] }, include:{ reward:true } });
    if (alt) bill = alt as any;
  }
  if (!bill) return NextResponse.json({ error:"Bill not found — check Bill ID/Number and QR token (token may be stale after re-login). Try scanning fresh POS QR." }, { status:404 });
  // optional strict token check - warn but don't block if token mismatch but billId matches
  if (qrToken && bill.qrToken && bill.qrToken !== qrToken && bill.id !== qrToken && bill.billNumber !== billId) {
    // if bill found via billId but token mismatch, still allow but log
    console.warn("QR token mismatch", { expected: bill.qrToken, got: qrToken, billId });
  }
  return NextResponse.json({ bill, alreadyClaimed: !!bill.reward, eligible: bill.paymentStatus==="PAID" && !bill.reward });
}
