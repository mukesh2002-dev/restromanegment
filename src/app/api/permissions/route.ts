import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";

const defaults=[
  { name:"menu:read", description:"View menu", roles:["OWNER","MANAGER","CASHIER","WAITER","CHEF"] },
  { name:"menu:write", description:"Edit menu", roles:["OWNER","MANAGER"] },
  { name:"table:manage", description:"Manage tables", roles:["OWNER","MANAGER"] },
  { name:"order:create", description:"Create orders", roles:["OWNER","MANAGER","CASHIER","WAITER"] },
  { name:"billing:write", description:"Billing/payments", roles:["OWNER","MANAGER","CASHIER"] },
  { name:"kitchen:manage", description:"KOT/kitchen", roles:["OWNER","MANAGER","CHEF","KITCHEN_MANAGER","KITCHEN_STAFF"] },
  { name:"customer:read", description:"View customers", roles:["OWNER","MANAGER","CASHIER"] },
  { name:"delivery:manage", description:"Delivery orders", roles:["OWNER","MANAGER","DELIVERY_MANAGER"] },
  { name:"inventory:manage", description:"Inventory/purchasing", roles:["OWNER","MANAGER"] },
  { name:"reports:read", description:"View reports", roles:["OWNER","MANAGER"] },
  { name:"admin:users", description:"Manage users", roles:["OWNER","MANAGER"] },
];

export async function GET(){
  const dbOk=await isDbAvailable();
  if(!dbOk) return NextResponse.json(defaults);
  let list=await prisma.permission.findMany();
  if(list.length===0){
    for(const p of defaults){
      await prisma.permission.create({ data:{ name: p.name, description: p.description, roles: p.roles as never }}).catch(()=>null);
    }
    list=await prisma.permission.findMany();
  }
  return NextResponse.json(list);
}
