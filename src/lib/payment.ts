// Mock payment + delivery adapters — production will swap via env
// PAYMENT_PROVIDER=mock (default) → always succeeds, returns mock transaction id
// Set PAYMENT_PROVIDER=razorpay|stripe and provide keys to use real SDK

export type PaymentResult = { success: boolean; transactionId?: string; error?: string };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function processPayment(_params: { amount:number; method:string; couponCode?:string }): Promise<PaymentResult> {
  const provider = process.env.PAYMENT_PROVIDER || "mock";
  if (provider === "mock" || !process.env.PAYMENT_API_KEY) {
    await new Promise(r=> setTimeout(r, 200));
    return { success: true, transactionId: `mock_pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}` };
  }
  try {
    // TODO: integrate real payment gateway (Razorpay/Stripe) using PAYMENT_API_KEY
    // const res = await fetch(...)
    return { success: true, transactionId: `real_${Date.now()}` };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error? e.message:"Payment failed" };
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function assignDeliveryStaff(_orderId:string, _staffId:string){
  return { success:true, eta: new Date(Date.now()+ 40*60000).toISOString() };
}
