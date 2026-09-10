export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { demoCoupons } from "@/data/demo";

export async function GET(req: Request){
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const customerId = url.searchParams.get("customerId");
  const take = Math.min(Number(url.searchParams.get("take")||"20"), 100);
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    let list=[...demoCoupons];
    if (status && status!=="ALL") list=list.filter(c=>c.status===status);
    if (customerId) list=list.filter(c=>c.customerId===customerId);
    return NextResponse.json(list.slice(0,take));
  }
  const where: Record<string, unknown> = {};
  if (status && status!=="ALL") (where as Record<string,unknown>).status = status;
  if (customerId) (where as Record<string,unknown>).customerId = customerId;
  const coupons = await prisma.coupon.findMany({ where, orderBy:{ createdAt:"desc"}, take, include:{ customer:true, campaign:true } });
  return NextResponse.json(coupons);
}

