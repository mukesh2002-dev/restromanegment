/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/purity, react-hooks/set-state-in-effect */
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type DeliveryOrder = {
  id:string; orderNumber:string; customerName:string; customerPhone:string; customerEmail?:string; address:string; area?:string; instructions?:string;
  items:{name:string; quantity:number; unitPrice:number}[]; subtotal:number; taxAmount:number; discountAmount:number; couponCode?:string; deliveryFee:number; totalAmount:number;
  status:string; paymentMethod?:string; paymentStatus?:string; assignedTo?:string|null; estimatedDeliveryTime?:string; otp?:string; createdAt:string; updatedAt:string;
};

const statuses=["ALL","PLACED","CONFIRMED","PREPARING","READY","OUT_FOR_DELIVERY","DELIVERED","CANCELLED","FAILED"] as const;
const nextMap:Record<string,string[]>={ PLACED:["CONFIRMED"], PENDING:["CONFIRMED"], CONFIRMED:["PREPARING"], PREPARING:["READY"], READY:["OUT_FOR_DELIVERY"], OUT_FOR_DELIVERY:["DELIVERED"], DELIVERED:[], CANCELLED:[], FAILED:[] };
const staffOptions=[
  { id:"staff_14", name:"Delivery Manager — Divya Iyer" },
  { id:"staff_10", name:"Chef — Kavya Nair (temp delivery)" },
  { id:"staff_01", name:"Owner — Aarav Sharma" },
];

export default function DeliveryPage(){
  const [orders,setOrders]=useState<DeliveryOrder[]>([]);
  const [filter,setFilter]=useState<string>("ALL");
  const [msg,setMsg]=useState("");
  const [assign,setAssign]=useState<Record<string,string>>({});

  async function load(){
    const q= filter!=="ALL"? `?status=${filter}&take=50`:"?take=50";
    try{ const r=await fetch(`/api/delivery-orders${q}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }); const j=await r.json(); if(Array.isArray(j)) setOrders(j); } catch{}
  }
  useEffect(()=>{ load(); },[filter]);
  useEffect(()=>{ const id=setInterval(load,15000); return ()=>clearInterval(id); },[]);

  async function advance(o:DeliveryOrder, next:string){
    const body:any={ status: next };
    if(next==="OUT_FOR_DELIVERY"){
      const staff=assign[o.id] || staffOptions[0].id;
      body.assignedTo=staff;
      body.estimatedDeliveryTime=new Date(Date.now()+ 30*60000).toISOString();
    }
    const res=await fetch(`/api/delivery-orders/${o.id}`,{ method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(body)});
    if(!res.ok){ const j=await res.json().catch(()=>({})); setMsg(j.error||"Transition failed"); return; }
    setMsg(`${o.orderNumber} â†’ ${next}`); load();
  }
  async function assignStaff(o:DeliveryOrder){
    const staff=assign[o.id];
    if(!staff){ setMsg("Select staff"); return; }
    const res=await fetch(`/api/delivery-orders/${o.id}`,{ method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ assignedTo: staff, estimatedDeliveryTime: new Date(Date.now()+ 35*60000).toISOString() })});
    if(!res.ok){ const j=await res.json(); setMsg(j.error||"Assign failed"); return; }
    setMsg(`Assigned ${staff} to ${o.orderNumber}`); load();
  }

  const counts=statuses.reduce((acc,s)=>{ if(s==="ALL") acc[s]=orders.length; else acc[s]=orders.filter(o=> o.status===s).length; return acc; },{} as Record<string,number>);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Delivery Management</h1>
        <div className="flex gap-2">
          <Link href="/order" className="text-sm underline">Public Ordering â†’</Link>
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
        </div>
      </div>
      {msg && <div className="text-sm bg-amber-50 border border-amber-200 rounded p-2">{msg}</div>}
      <div className="flex flex-wrap gap-2">
        {statuses.map(s=> <button key={s} onClick={()=> setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filter===s? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900":"bg-white dark:bg-zinc-900"}`}>{s} {s!=="ALL"?`(${counts[s]||0})`:`(${orders.length})`}</button>)}
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {orders.length===0? <Card className="col-span-full"><CardContent className="p-8 text-center text-sm text-zinc-500">No orders for this filter — place via <Link href="/order" className="underline">/order</Link> or POS DELIVERY type</CardContent></Card> :
          orders.map(o=>(
            <Card key={o.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between gap-2"><span className="font-mono text-sm font-bold">{o.orderNumber}</span><Badge className={o.status==="DELIVERED"?"bg-green-600 text-white": o.status==="OUT_FOR_DELIVERY"?"bg-blue-600 text-white": o.status==="CANCELLED"?"bg-red-600 text-white":"bg-zinc-100"}>{o.status}</Badge></div>
                <CardDescription className="text-xs">{o.customerName} • {o.customerPhone} • {o.customerEmail||"—"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 flex-1 flex flex-col text-sm">
                <div className="text-xs bg-zinc-50 dark:bg-zinc-900 border rounded p-2">{o.address}{o.area?` • ${o.area}`:""}<div className="text-zinc-500">Instructions: {o.instructions||"—"}</div></div>
                <div className="space-y-1 border rounded p-2 bg-white dark:bg-zinc-900">
                  {o.items?.slice(0,4).map((it,i)=> <div key={i} className="flex justify-between text-xs"><span>{it.name} Ã—{it.quantity}</span><span>₹{it.unitPrice*it.quantity}</span></div>)}
                  {o.items?.length>4 && <div className="text-xs text-zinc-500">+{o.items.length-4} more</div>}
                  <div className="flex justify-between text-xs border-t pt-1"><span>Subtotal ₹{o.subtotal} + Tax ₹{o.taxAmount} + Fee ₹{o.deliveryFee} {o.discountAmount? `- Disc ₹${o.discountAmount} (${o.couponCode})`:""}</span></div>
                  <div className="flex justify-between font-bold"><span>Total</span><span>₹{o.totalAmount}</span></div>
                  <div className="text-xs text-zinc-500">Payment {o.paymentMethod} ({o.paymentStatus}) • OTP {o.otp||"—"} • ETA {o.estimatedDeliveryTime? new Date(o.estimatedDeliveryTime).toLocaleTimeString():"—"}</div>
                  <div className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleString()} • Assigned: {o.assignedTo||"—"}</div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 mt-auto">
                  {(nextMap[o.status]||[]).map(n=> <Button key={n} size="sm" className="h-7 text-xs" onClick={()=> advance(o,n)}>{n}</Button>)}
                  <Link href={`/order/track/${o.id}`} className="text-xs underline self-center">Track</Link>
                </div>
                {o.status==="READY" && (
                  <div className="flex gap-2 pt-2 border-t">
                    <select value={assign[o.id]||""} onChange={e=> setAssign(prev=> ({...prev, [o.id]: e.target.value}))} className="flex-1 border rounded h-7 text-xs px-2"><option value="">Assign staff…</option>{staffOptions.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                    <Button size="sm" className="h-7 text-xs" onClick={()=> advance(o,"OUT_FOR_DELIVERY")}>Dispatch</Button>
                  </div>
                )}
                {o.status==="PLACED" && (
                  <div className="flex gap-2 pt-2 border-t">
                    <select value={assign[o.id]||""} onChange={e=> setAssign(prev=> ({...prev, [o.id]: e.target.value}))} className="flex-1 border rounded h-7 text-xs px-2"><option value="">Assign…</option>{staffOptions.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=> assignStaff(o)}>Assign</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        }
      </div>
      <Card><CardContent className="p-3 text-xs text-zinc-500">Workflow: PLACED â†’ CONFIRMED â†’ PREPARING â†’ READY â†’ OUT_FOR_DELIVERY â†’ DELIVERED. Dine-in/Takeaway/Delivery types supported. Delivery fee ₹40, coupon server-validated, mock payment always succeeds (PAYMENT_PROVIDER=mock). Assignment + ETA via PATCH with RBAC OWNER/MANAGER/DELIVERY_MANAGER.</CardContent></Card>
    </div>
  );
}

