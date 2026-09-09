import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { inventoryService } from "@/lib/inventory-service";
import { supplierSchema } from "@/lib/validators";
import { getSession } from "@/lib/auth";

export async function GET(){
  const dbOk=await isDbAvailable();
  if(!dbOk) return NextResponse.json(inventoryService.listSuppliers());
  const session=await getSession();
  const list=await prisma.supplier.findMany({ where:{ restaurantId: session?.restaurantId }, orderBy:{ name:"asc"} });
  return NextResponse.json(list);
}

export async function POST(req: Request){
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const parsed=supplierSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const dbOk=await isDbAvailable();
  if(!dbOk){
    const created=inventoryService.createSupplier({
      name: parsed.data.name,
      contactName: parsed.data.contactName||undefined,
      phone: parsed.data.phone||undefined,
      email: parsed.data.email||undefined,
      address: parsed.data.address||undefined,
      gstin: parsed.data.gstin||undefined,
    } as never);
    return NextResponse.json(created,{status:201});
  }
  const created=await prisma.supplier.create({
    data:{
      restaurantId: session.restaurantId,
      name: parsed.data.name,
      contactName: parsed.data.contactName||undefined,
      phone: parsed.data.phone||undefined,
      email: parsed.data.email||undefined,
      address: parsed.data.address||undefined,
      gstin: parsed.data.gstin||undefined,
    }
  });
  return NextResponse.json(created,{status:201});
}
