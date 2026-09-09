import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { demoStaff } from "@/data/demo";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  password: z.string().min(6).max(50),
  role: z.enum(["OWNER","MANAGER","CASHIER","WAITER","KITCHEN_STAFF","KITCHEN_MANAGER","CHEF","DELIVERY_MANAGER"]),
});

export async function GET(){
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  const dbOk=await isDbAvailable();
  if(!dbOk){
    return NextResponse.json(demoStaff.map(s=> ({ id: s.id, name: s.name, email: s.email, role: s.role, isActive: s.isActive })));
  }
  const users=await prisma.staff.findMany({ where:{ restaurantId: session.restaurantId }, orderBy:{ createdAt:"desc"}, select:{ id:true, name:true, email:true, phone:true, role:true, isActive:true, createdAt:true }});
  return NextResponse.json(users);
}

export async function POST(req: Request){
  const session=await getSession();
  if(!session) return NextResponse.json({ error:"Unauthorized"},{status:401});
  if(!["OWNER","MANAGER"].includes(session.role)) return NextResponse.json({ error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null);
  const parsed=createUserSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()},{status:400});
  const { name, email, phone, password, role }=parsed.data;
  const dbOk=await isDbAvailable();
  if(!dbOk){
    return NextResponse.json({ id:`staff_${Date.now()}`, name, email, phone, role, isActive:true }, {status:201});
  }
  const bcrypt=await import("bcryptjs");
  const hash=await bcrypt.hash(password,10);
  try{
    const user=await prisma.staff.create({ data:{ restaurantId: session.restaurantId, name, email, phone, passwordHash: hash, role: role as never }});
    await prisma.auditLog.create({ data:{ staffId: session.staffId, action:"CREATE_USER", entity:"Staff", entityId: user.id, details:{ email, role } as never }}).catch(()=>null);
    return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role }, {status:201});
  } catch(e: unknown){
    const msg=e instanceof Error? e.message:"Error";
    if(msg.includes("Unique")) return NextResponse.json({ error:"Email already exists"},{status:409});
    return NextResponse.json({ error:msg},{status:500});
  }
}
