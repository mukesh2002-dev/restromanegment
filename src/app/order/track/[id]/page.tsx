/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const steps=["PLACED","CONFIRMED","PREPARING","READY","OUT_FOR_DELIVERY","DELIVERED"] as const;

export default function TrackPage(){
  const params=useParams();
  const id=params.id as string;
  const [order,setOrder]=useState<{id:string; orderNumber:string; status:string; customerName:string; address:string; totalAmount:number; estimatedDeliveryTime?:string; assignedTo?:string; items:{name:string; quantity:number; unitPrice:number}[]; paymentMethod?:string; paymentStatus?:string; createdAt:string}|null>(null);
  const [msg,setMsg]=useState("");

  async function load(){
    try{
      const r=await fetch(`/api/delivery-orders/${encodeURIComponent(id)}`);
      const j=await r.json();
      if(!r.ok){ setMsg(j.error||"Not found"); return; }
      setOrder(j);
    } catch{ setMsg("Load failed"); }
  }
  useEffect(()=>{ load(); const i=setInterval(load, 15000); return ()=>clearInterval(i); },[id]);

  if(!order) return <div className="min-h-screen flex items-center justify-center p-4"><Card className="w-full max-w-md"><CardContent className="p-6 text-center">{msg? <span className="text-red-600">{msg}</span>:"Loading…"}</CardContent></Card></div>;

  const idx=steps.indexOf(order.status as typeof steps[number]);
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link href="/order" className="text-sm underline">← Back to Ordering</Link>
        <Card>
          <CardHeader><CardTitle>Order Tracking • {order.orderNumber}</CardTitle><CardDescription>{order.customerName} • {order.address} • Payment {order.paymentMethod} ({order.paymentStatus})</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-1 items-center overflow-x-auto">
              {steps.map((s,i)=>(
                <div key={s} className="flex items-center gap-1">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${i<=idx? "bg-green-600 text-white": i===idx+1? "bg-amber-400 text-zinc-900":"bg-zinc-200 text-zinc-500"}`}>{i+1}</div>
                  <span className={`text-xs ${i===idx? "font-bold text-green-700":"text-zinc-500"}`}>{s}</span>
                  {i<steps.length-1 && <div className={`h-0.5 w-6 ${i<idx? "bg-green-600":"bg-zinc-200"}`} />}
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-center"><Badge className={order.status==="DELIVERED"?"bg-green-600 text-white": order.status==="CANCELLED"?"bg-red-600 text-white":"bg-zinc-900 text-white"}>{order.status}</Badge>{order.estimatedDeliveryTime && <span className="text-sm">ETA {new Date(order.estimatedDeliveryTime).toLocaleTimeString()} • OTP { (order as unknown as {otp:string}).otp || "—"}</span>}{order.assignedTo && <span className="text-xs text-zinc-500">Staff {order.assignedTo}</span>}</div>
            <div className="border rounded p-3 space-y-1 text-sm">
              {order.items?.map((it,i)=> <div key={i} className="flex justify-between"><span>{it.name} ×{it.quantity}</span><span>₹{it.unitPrice*it.quantity}</span></div>)}
              <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>₹{order.totalAmount}</span></div>
              <div className="text-xs text-zinc-500">Ordered {new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={load}>Refresh</Button>
              <Button onClick={()=> navigator.clipboard.writeText(order.id)}>Copy ID</Button>
            </div>
            <div className="text-xs text-zinc-500">Auto-refresh every 15s • Mock delivery — status advances via dashboard /delivery</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
