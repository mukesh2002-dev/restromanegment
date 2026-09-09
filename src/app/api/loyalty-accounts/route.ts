import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { demoCustomers } from "@/data/demo";
import { getSession } from "@/lib/auth";

export async function GET(req: Request){
  const url=new URL(req.url);
  const customerId=url.searchParams.get("customerId");
  const dbOk=await isDbAvailable();
  if(!dbOk){
    if(customerId){
      const c=demoCustomers.find(x=> x.id===customerId) as unknown as {loyaltyPoints:number};
      if(!c) return NextResponse.json({ error:"Not found"},{status:404});
      return NextResponse.json({ id:`la_${customerId}`, customerId, points: c.loyaltyPoints, tier: c.loyaltyPoints>300?"GOLD": c.loyaltyPoints>100?"SILVER":"BRONZE" });
    }
    return NextResponse.json(demoCustomers.slice(0,20).map(c=> ({ id:`la_${c.id}`, customerId: c.id, points: (c as unknown as {loyaltyPoints:number}).loyaltyPoints, tier:"BRONZE" })));
  }
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(customerId){
    const acc=await prisma.loyaltyAccount.findUnique({ where:{ customerId }});
    if(!acc){
      const cust=await prisma.customer.findUnique({ where:{ id: customerId }});
      if(!cust) return NextResponse.json({ error:"Customer not found"},{status:404});
      const created=await prisma.loyaltyAccount.create({ data:{ customerId, points: cust.loyaltyPoints, tier: cust.loyaltyPoints>300?"GOLD": cust.loyaltyPoints>100?"SILVER":"BRONZE" }});
      return NextResponse.json(created);
    }
    return NextResponse.json(acc);
  }
  const list=await prisma.loyaltyAccount.findMany({ take:20, include:{ customer:true }});
  return NextResponse.json(list);
}
