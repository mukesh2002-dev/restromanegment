export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { reportsService } from "@/lib/reports-service";
import { getSession } from "@/lib/auth";

export async function GET(req: Request){
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  const url=new URL(req.url);
  const from=url.searchParams.get("from")||undefined;
  const to=url.searchParams.get("to")||undefined;
  const channel=url.searchParams.get("channel")||undefined;
  const campaign=url.searchParams.get("campaign")||undefined;
  const data=await reportsService.getReports({ from, to, channel, campaign });
  return NextResponse.json(data);
}

