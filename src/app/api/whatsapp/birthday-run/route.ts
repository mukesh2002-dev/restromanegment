export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { automationService } from "@/lib/automation-service";
import { getSession } from "@/lib/auth";

export async function POST(req: Request){
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const campaignId=body?.campaignId as string | undefined;
  const result=await automationService.runBirthdayCampaign(campaignId);
  return NextResponse.json(result);
}

