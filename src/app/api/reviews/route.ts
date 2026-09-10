export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { demoReviews } from "@/data/demo";

export async function GET(req: Request){
  const url = new URL(req.url);
  const billId = url.searchParams.get("billId");
  const rating = url.searchParams.get("rating");
  const take = Math.min(Number(url.searchParams.get("take")||"20"), 100);
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    let list=[...demoReviews];
    if (billId) list=list.filter(r=>r.billId===billId);
    if (rating) list=list.filter(r=>String(r.rating)===rating);
    return NextResponse.json(list.slice(0,take));
  }
  const where: Record<string, unknown> = {};
  if (billId) (where as Record<string,unknown>).billId = billId;
  if (rating) (where as Record<string,unknown>).rating = Number(rating);
  const reviews = await prisma.review.findMany({ where, orderBy:{ createdAt:"desc"}, take, include:{ customer:true, bill:true } });
  return NextResponse.json(reviews);
}

