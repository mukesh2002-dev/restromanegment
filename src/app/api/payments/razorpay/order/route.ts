import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isDbAvailable } from "@/lib/db";
import { createRazorpayOrder } from "@/lib/razorpay";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(()=>null);
  const { amount, receipt, notes } = body || {};
  // amount expected in INR rupees (e.g. 315), we convert to paise
  const amt = Number(amount);
  if (!amt || amt <= 0) return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
  const amountPaise = Math.round(amt * 100);
  const receiptId = receipt || `rcpt_${Date.now()}_${session.staffId.slice(0,6)}`;

  const dbOk = await isDbAvailable();
  // even in demo we allow order creation
  try {
    const order = await createRazorpayOrder(amountPaise, receiptId, notes);
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency || "INR",
      receipt: order.receipt || receiptId,
      keyId: order.keyId,
      mock: order.mock || false,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error? e.message:"Razorpay failed" }, { status: 500 });
  }
}
