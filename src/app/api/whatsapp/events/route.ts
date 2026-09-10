export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { EVENT_TEMPLATES } from "@/lib/whatsapp";

export async function GET(){
  const events=Object.entries(EVENT_TEMPLATES).map(([event, t])=> ({ event, ...t }));
  return NextResponse.json(events);
}

