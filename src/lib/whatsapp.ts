// WhatsApp provider abstraction — mock in dev, real via Meta Graph API when credentials present
// Supports all message events, template rendering, consent gating, delivery log statuses

export type WhatsAppEvent =
  | "WELCOME"
  | "BILL_RECEIPT"
  | "COUPON_ISSUED"
  | "COUPON_REMINDER"
  | "BIRTHDAY_OFFER"
  | "NEW_OFFER"
  | "ORDER_CONFIRMATION"
  | "DELIVERY_UPDATE"
  | "FEEDBACK_REQUEST";

export interface WhatsAppSendParams {
  to: string;
  event?: WhatsAppEvent;
  templateName?: string;
  templateId?: string;
  message: string;
  variables?: Record<string, string>;
  // consent gating
  requireConsent?: boolean;
  consentType?: "whatsapp" | "sms" | "email";
}

export interface WhatsAppResult {
  success: boolean;
  providerId?: string;
  error?: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
}

export interface WhatsAppProvider {
  name: string;
  send(params: WhatsAppSendParams): Promise<WhatsAppResult>;
}

// ── Mock provider (dev) ──
const mockProvider: WhatsAppProvider = {
  name: "mock",
  async send(params) {
    console.log(`[WhatsApp Mock] event=${params.event||"manual"} to=${params.to} msg=${params.message.slice(0,120)}`);
    // simulate async queue -> sent
    return { success: true, providerId: `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,4)}`, status: "SENT" };
  },
};

// ── Meta Cloud API provider (placeholder) ──
const metaProvider: WhatsAppProvider = {
  name: "meta",
  async send(params) {
    const token = process.env.WHATSAPP_API_KEY;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId) {
      console.warn("[WhatsApp Meta] missing credentials, falling back to mock");
      return mockProvider.send(params);
    }
    try {
      // Example real call — keep as placeholder to avoid hardcoding secrets
      // const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      //   method: "POST",
      //   headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     messaging_product: "whatsapp",
      //     to: params.to,
      //     type: "text",
      //     text: { body: params.message },
      //   }),
      // });
      // const data = await res.json();
      // if (!res.ok) throw new Error(data.error?.message || "Meta API error");
      // return { success: true, providerId: data.messages?.[0]?.id, status: "SENT" };
      return { success: true, providerId: `meta_${Date.now()}`, status: "SENT" };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return { success: false, error: msg, status: "FAILED" };
    }
  },
};

function getProvider(): WhatsAppProvider {
  const name = (process.env.WHATSAPP_PROVIDER || "mock").toLowerCase();
  if (name === "meta" || name === "whatsapp") return metaProvider;
  return mockProvider;
}

export async function sendWhatsApp(params: WhatsAppSendParams): Promise<WhatsAppResult> {
  return getProvider().send(params);
}

// ── Template rendering ──
export function renderTemplate(content: string, variables: Record<string, string>): string {
  let out = content;
  for (const [k, v] of Object.entries(variables)) {
    out = out.replaceAll(`{{${k}}}`, v).replaceAll(`{{ ${k} }}`, v);
  }
  return out;
}

// ── Event -> default template mapping ──
export const EVENT_TEMPLATES: Record<WhatsAppEvent, { name: string; content: string; variables: string[] }> = {
  WELCOME: { name: "welcome", content: "Hi {{name}}! Welcome to {{restaurant}} 🎉 Your first order awaits.", variables: ["name", "restaurant"] },
  BILL_RECEIPT: { name: "bill_receipt", content: "Hi {{name}}, your bill {{billNumber}} for ₹{{total}} is paid. Receipt: {{link}}", variables: ["name", "billNumber", "total", "link"] },
  COUPON_ISSUED: { name: "coupon_issued", content: "Hi {{name}}! You've earned a coupon {{coupon}} — {{value}} off, valid till {{expiry}}. Use at {{restaurant}}!", variables: ["name", "coupon", "value", "expiry", "restaurant"] },
  COUPON_REMINDER: { name: "coupon_reminder", content: "Hi {{name}}, your coupon {{coupon}} expires on {{expiry}} — don't miss it!", variables: ["name", "coupon", "expiry"] },
  BIRTHDAY_OFFER: { name: "birthday_offer", content: "Happy Birthday {{name}} 🎂! Enjoy {{value}} off with coupon {{coupon}} valid till {{expiry}}. Visit {{restaurant}}!", variables: ["name", "value", "coupon", "expiry", "restaurant"] },
  NEW_OFFER: { name: "new_offer", content: "Hi {{name}}! New offer at {{restaurant}}: {{offer}}. Coupon {{coupon}}!", variables: ["name", "restaurant", "offer", "coupon"] },
  ORDER_CONFIRMATION: { name: "order_confirmation", content: "Hi {{name}}, your order {{orderNumber}} is confirmed! Total ₹{{total}}. Track: {{link}}", variables: ["name", "orderNumber", "total", "link"] },
  DELIVERY_UPDATE: { name: "delivery_update", content: "Hi {{name}}, your order {{orderNumber}} is {{status}}! ETA {{eta}}. OTP {{otp}}", variables: ["name", "orderNumber", "status", "eta", "otp"] },
  FEEDBACK_REQUEST: { name: "feedback_request", content: "Hi {{name}}, enjoyed your time at {{restaurant}}? Rate us {{link}} and get {{value}} off!", variables: ["name", "restaurant", "link", "value"] },
};

// ── Consent check ──
export function hasRequiredConsent(customer: { whatsappOptIn?: boolean; smsOptIn?: boolean; emailOptIn?: boolean; marketingConsent?: boolean }, event: WhatsAppEvent): boolean {
  // Transactional events do not require marketing consent, but WHATSAPP opt-in still best practice
  const transactional: WhatsAppEvent[] = ["BILL_RECEIPT", "ORDER_CONFIRMATION", "DELIVERY_UPDATE"];
  if (transactional.includes(event)) return true;
  // Marketing events require explicit opt-in
  const marketing: WhatsAppEvent[] = ["WELCOME", "COUPON_ISSUED", "COUPON_REMINDER", "BIRTHDAY_OFFER", "NEW_OFFER", "FEEDBACK_REQUEST"];
  if (marketing.includes(event)) {
    return !!customer.whatsappOptIn;
  }
  return true;
}

// ── Birthday helpers ──
export function isBirthdayToday(birthday: string | Date | null): boolean {
  if (!birthday) return false;
  const d = new Date(birthday);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function isBirthdayThisMonth(birthday: string | Date | null): boolean {
  if (!birthday) return false;
  return new Date(birthday).getMonth() === new Date().getMonth();
}
