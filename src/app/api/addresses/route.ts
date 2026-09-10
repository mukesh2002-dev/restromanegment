export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const schema=z.object({
  customerId: z.string().optional(),
  label: z.string().max(20).optional(),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  pincode: z.string().max(10).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(req: Request){
  const url=new URL(req.url);
  const customerId=url.searchParams.get("customerId");
  const dbOk=await isDbAvailable();
  if(!dbOk) return NextResponse.json([{ id:"addr_1", customerId: customerId||"cust_1", line1:"100 MG Road", city:"Pune", pincode:"411001", isDefault:true }]);
  const where:Record<string,unknown>={};
  if(customerId) (where as Record<string,unknown>).customerId=customerId;
  const list=await prisma.address.findMany({ where: where as never, orderBy:{ isDefault:"desc"} });
  return NextResponse.json(list);
}

export async function POST(req: Request){
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>null);
  const parsed=schema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const dbOk=await isDbAvailable();
  if(!dbOk) return NextResponse.json({ id:`addr_${Date.now()}`, ...parsed.data, createdAt: new Date().toISOString()},{status:201});
  const created=await prisma.address.create({ data: parsed.data as never });
  return NextResponse.json(created,{status:201});
}

