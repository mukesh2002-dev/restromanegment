import { NextResponse } from "next/server";
import { isDbAvailable, prisma } from "@/lib/db";
import { deliveryOrderSchema } from "@/lib/validators";
import { demoMenuItems, demoDeliveryOrders } from "@/data/demo";
import { processPayment } from "@/lib/payment";
import { getSession } from "@/lib/auth";

// in-memory fallback for demo when DB unavailable
const g = globalThis as unknown as { __deliveryStore?: typeof demoDeliveryOrders };
function getStore(){
  if(!g.__deliveryStore){
    // clone demo with enriched fields
    g.__deliveryStore = (demoDeliveryOrders as unknown as typeof demoDeliveryOrders).map(d=> ({
      ...d,
      customerEmail: "",
      instructions: "",
      subtotal: d.totalAmount - 40,
      taxAmount: 0,
      discountAmount: 0,
      couponCode: null as string|null,
      deliveryFee: 40,
      paymentMethod: "CASH",
      paymentStatus: "PENDING" as const,
      estimatedDeliveryTime: new Date(Date.now()+ 40*60000).toISOString(),
      otp: String(Math.floor(1000+ Math.random()*9000)),
      // map status to new enum if needed
      status: (d.status==="PENDING"?"PLACED": d.status) as unknown as typeof d.status,
    })) as unknown as typeof demoDeliveryOrders;
  }
  return g.__deliveryStore!;
}

export async function GET(req: Request){
  const url=new URL(req.url);
  const status=url.searchParams.get("status");
  const take=Math.min(Number(url.searchParams.get("take")||"20"),100);
  const dbOk=await isDbAvailable();
  if(!dbOk){
    let list=[...getStore()];
    if(status && status!=="ALL") list=list.filter(d=> (d as {status:string}).status===status);
    return NextResponse.json(list.slice(0,take));
  }
  const session=await getSession();
  // delivery management is protected — require session for dashboard
  const where:Record<string,unknown>={};
  if(status && status!=="ALL") (where as Record<string,unknown>).status=status;
  // scope to restaurant if available
  if(session?.restaurantId) (where as Record<string,unknown>).restaurantId=session.restaurantId;
  const orders=await prisma.deliveryOrder.findMany({ where: where as never, orderBy:{ createdAt:"desc"}, take });
  return NextResponse.json(orders);
}

export async function POST(req: Request){
  const body=await req.json().catch(()=>null);
  const parsed=deliveryOrderSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error:"Invalid", details: parsed.error.flatten()}, { status:400 });
  const { customerName, customerPhone, customerEmail, address, area, instructions, items, couponCode, paymentMethod } = parsed.data;

  // server must not trust client prices — fetch from menu
  const dbOk=await isDbAvailable();
  let subtotal=0;
  const resolvedItems: { menuItemId:string; name:string; quantity:number; unitPrice:number; totalPrice:number }[] = [];
  if(!dbOk){
    for(const it of items){
      const menu=demoMenuItems.find(m=> m.id===it.menuItemId);
      if(!menu) return NextResponse.json({ error:`Menu item ${it.menuItemId} not found`},{status:404});
      if(!menu.isAvailable) return NextResponse.json({ error:`${menu.name} unavailable`},{status:400});
      const unit=menu.price;
      // variants/addOns not priced in demo fallback (keep simple)
      const total=unit*it.quantity;
      subtotal+=total;
      resolvedItems.push({ menuItemId: it.menuItemId, name: menu.name, quantity: it.quantity, unitPrice: unit, totalPrice: total });
    }
  } else {
    for(const it of items){
      const menu=await prisma.menuItem.findUnique({ where:{ id: it.menuItemId }, include:{ variants:true, addOns:true } });
      if(!menu) return NextResponse.json({ error:`Menu item ${it.menuItemId} not found`},{status:404});
      if(!menu.isAvailable) return NextResponse.json({ error:`${menu.name} unavailable`},{status:400});
      let unit=menu.price;
      if(it.variantId){ const v=menu.variants.find(x=> x.id===it.variantId); if(v) unit+=v.priceDelta; }
      if(it.addOnIds?.length){ for(const aid of it.addOnIds){ const ao=menu.addOns.find(x=> x.id===aid); if(ao) unit+=ao.price; } }
      const total=unit*it.quantity;
      subtotal+=total;
      resolvedItems.push({ menuItemId: it.menuItemId, name: menu.name, quantity: it.quantity, unitPrice: unit, totalPrice: total });
    }
  }
  const taxAmount=Math.round(subtotal*0.05);
  let discountAmount=0;
  let couponApplied=null as unknown as { code:string; discount:number }|null;
  if(couponCode){
    // validate coupon server-side (reuse demo or DB)
    const dbOk2=await isDbAvailable();
    if(!dbOk2){
      const { demoCoupons }=await import("@/data/demo");
      const c=demoCoupons.find(x=> x.code===couponCode);
      if(!c) return NextResponse.json({ error:"Invalid coupon", code:"INVALID_COUPON"},{status:400});
      if(c.status!=="ACTIVE") return NextResponse.json({ error:"Coupon not active", code:"COUPON_INACTIVE"},{status:400});
      // minSpend 200 for demo
      if(subtotal < 200) return NextResponse.json({ error:"Minimum spend not met", code:"MIN_SPEND"},{status:400});
      const disc=c.rewardType==="PERCENTAGE"? Math.round(subtotal* Number(c.value)/100): Number(c.value);
      discountAmount=disc;
      couponApplied={ code: c.code, discount: disc };
    } else {
      const c=await prisma.coupon.findUnique({ where:{ code: couponCode } });
      if(!c) return NextResponse.json({ error:"Invalid coupon"},{status:400});
      if(c.status!=="ACTIVE") return NextResponse.json({ error:"Coupon not active"},{status:400});
      if(c.expiryDate < new Date()) return NextResponse.json({ error:"Coupon expired"},{status:400});
      if(subtotal < c.minSpend) return NextResponse.json({ error:`Min spend ₹${c.minSpend} not met`},{status:400});
      let disc=0;
      if(c.rewardType==="PERCENTAGE"){ disc=Math.round(subtotal* c.value/100); if(c.maxDiscount) disc=Math.min(disc,c.maxDiscount); }
      else if(c.rewardType==="FIXED") disc=c.value;
      discountAmount=disc;
      couponApplied={ code: c.code, discount: disc };
    }
  }
  const deliveryFee = 40;
  const totalAmount = subtotal + taxAmount + deliveryFee - discountAmount;

  // mock payment — always succeeds in demo, but we record paymentStatus
  const pay=await processPayment({ amount: totalAmount, method: paymentMethod||"CASH", couponCode });
  if(!pay.success) return NextResponse.json({ error:"Payment failed", details: pay.error },{status:402});

  const orderNumber=`DEL-2026-${String(Date.now()).slice(-6)}${String(Math.floor(Math.random()*90+10))}`;
  const otp=String(Math.floor(1000+ Math.random()*9000));
  const estimatedDeliveryTime=new Date(Date.now()+ 40*60000).toISOString();

  if(!dbOk){
    const newOrder={
      id:`del_${Date.now()}`,
      orderNumber,
      customerName, customerPhone, customerEmail: customerEmail||null, address, area: area||null, instructions: instructions||null,
      items: resolvedItems,
      subtotal, taxAmount, discountAmount, couponCode: couponApplied?.code||null, deliveryFee, totalAmount,
      status: "PLACED" as const,
      paymentMethod: paymentMethod||"CASH",
      paymentStatus: "PAID" as const,
      assignedTo: null,
      estimatedDeliveryTime,
      otp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as typeof demoDeliveryOrders[number];
    getStore().unshift(newOrder as never);
    return NextResponse.json({ ...newOrder, payment: pay, couponApplied }, { status:201 });
  }
  // DB path — need restaurantId (use first restaurant or session)
  let restaurantId: string | null = null;
  const session2=await getSession().catch(()=>null);
  if(session2?.restaurantId) restaurantId=session2.restaurantId;
  else {
    const r=await prisma.restaurant.findFirst();
    restaurantId=r?.id||null;
  }
  const created=await prisma.deliveryOrder.create({
    data:{
      restaurantId,
      orderNumber,
      customerName, customerPhone, customerEmail: customerEmail||null, address, area: area||null, instructions: instructions||null,
      items: resolvedItems as never,
      subtotal, taxAmount, discountAmount, couponCode: couponApplied?.code||null, deliveryFee, totalAmount,
      status: "PLACED" as never,
      paymentMethod: paymentMethod||"CASH",
      paymentStatus: "PAID" as never,
      estimatedDeliveryTime: new Date(estimatedDeliveryTime),
      otp,
    }
  });
  // also optionally create a Coupon usage increment if coupon applied
  if(couponApplied){
    await prisma.coupon.update({ where:{ code: couponApplied.code }, data:{ usedCount:{ increment:1 }, status:"REDEEMED", redeemedAt: new Date() } }).catch(()=>null);
  }
  return NextResponse.json({ ...created, payment: pay, couponApplied }, { status:201 });
}
