import { NextResponse } from "next/server";
import { automationService } from "@/lib/automation-service";

export async function GET(req: Request){
  const url=new URL(req.url);
  const take=Math.min(Number(url.searchParams.get("take")||"50"),100);
  const list=await automationService.listLogs(take);
  return NextResponse.json(list);
}
