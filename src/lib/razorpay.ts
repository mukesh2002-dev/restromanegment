import crypto from "crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const CURRENCY = "INR";

export function isRazorpayConfigured(): boolean {
  return Boolean(KEY_ID && KEY_SECRET && !KEY_ID.includes("placeholder"));
}

export async function createRazorpayOrder(amountPaise: number, receipt: string, notes?: Record<string,string>) {
  if (!isRazorpayConfigured()) {
    // mock order — no network call
    const mockId = `order_mock_${Date.now()}${Math.floor(Math.random()*9000+1000)}`;
    return {
      id: mockId,
      amount: amountPaise,
      currency: CURRENCY,
      receipt,
      status: "created",
      keyId: "rzp_test_mockKey",
      mock: true,
    };
  }
  // real Razorpay API — server-side
  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: CURRENCY,
      receipt,
      notes,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Razorpay order failed: ${res.status} ${txt}`);
  }
  const data = await res.json();
  return { ...data, keyId: KEY_ID, mock: false };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!isRazorpayConfigured()) return true; // mock always valid
  const expected = crypto.createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  return expected === signature;
}

export function getRazorpayKeyId(): string {
  return KEY_ID || "rzp_test_mockKey";
}
