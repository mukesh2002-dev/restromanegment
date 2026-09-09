"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function TrackLookup(){
  const [id,setId]=useState("");
  const router=useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Track Your Order</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Order ID or Order Number e.g. del_... or DEL-2026-..." value={id} onChange={e=>setId(e.target.value)} />
          <Button className="w-full" disabled={!id.trim()} onClick={()=> router.push(`/order/track/${encodeURIComponent(id.trim())}`)}>Track</Button>
          <div className="text-xs text-zinc-500">Try demo: DEL-2026-... from /delivery or after placing an order</div>
        </CardContent>
      </Card>
    </div>
  );
}
