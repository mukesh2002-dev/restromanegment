import { NextResponse } from "next/server";
import { sendWhatsApp, type WhatsAppEvent } from "@/lib/whatsapp";
import { prisma, isDbAvailable } from "@/lib/db";
import { automationService } from "@/lib/automation-service";

export async function POST(req: Request) {
  const body = await req.json().catch(()=>null);
  const to = body?.to as string;
  const message = body?.message as string;
  const event = body?.event as WhatsAppEvent | undefined;
  const templateId = body?.templateId as string | undefined;
  const variables = body?.variables as Record<string,string> | undefined;
  if (!to || !message) return NextResponse.json({ error:"to and message required" }, { status:400 });
  // if event provided, use automationService for consent gating + logging with event
  if (event) {
    const result = await automationService.sendEvent(event, to, variables || { message }, undefined);
    return NextResponse.json(result);
  }
  const result = await sendWhatsApp({ to, message, templateId, variables, event });
  if (await isDbAvailable()) {
    await prisma.whatsAppLog.create({ data:{ toPhone: to, message, status: result.success?"SENT":"FAILED", event: event as never, templateId, providerId: result.providerId, error: result.error } }).catch(()=>null);
  } else {
    // also log via automationService in-memory
    await automationService.sendEvent((event||"NEW_OFFER") as WhatsAppEvent, to, { message } as never).catch(()=>null);
  }
  return NextResponse.json(result);
}
