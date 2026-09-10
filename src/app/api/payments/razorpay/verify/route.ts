export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { z } from "zod";

const schema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
  amount: z.number().optional(), // INR
});

export async function POST(req: Request) {
  // Payment verification is triggered from the UI after a successful checkout; do not block
  // valid same-origin requests on a protected POS session.
  const session = await getSession();
  const body = await req.json().catch(()=>null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"Invalid payload", details: parsed.error.flatten() }, { status:400 });
  const { orderId, paymentId, signature } = parsed.data;
  const ok = verifyRazorpaySignature(orderId, paymentId, signature);
  if (!ok) return NextResponse.json({ error:"Signature verification failed", code:"SIGNATURE_MISMATCH" }, { status:400 });
  // success — front-end should now create bill with ONLINE payment + reference
  return NextResponse.json({ verified:true, orderId, paymentId });
}

