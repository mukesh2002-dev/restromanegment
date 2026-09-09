import { NextResponse } from "next/server";
import { automationService } from "@/lib/automation-service";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export async function GET(){
  const list=await automationService.listTemplates();
  return NextResponse.json(list);
}

export async function POST(req: Request){
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const schema=z.object({ name: z.string().min(2).max(40).regex(/^[a-z0-9_]+$/), content: z.string().min(5).max(1000), variables: z.array(z.string()).optional() });
  const parsed=schema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const created=await automationService.createTemplate(parsed.data);
  return NextResponse.json(created,{status:201});
}
