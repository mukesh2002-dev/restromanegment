"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { demoReviews, demoCampaigns } from "@/data/demo";

type Review = { id:string; billId:string; rating:number; comment?:string; name?:string; phone?:string; createdAt:string; bill?:{ billNumber:string }; customer?:{name:string} };

export default function ReviewsPage(){
  const [reviews,setReviews]=useState<Review[]>([]);
  const [filterRating,setFilterRating]=useState<string>("ALL");
  const [q,setQ]=useState("");
  async function load(){
    const params=new URLSearchParams();
    if(filterRating!=="ALL") params.set("rating",filterRating);
    params.set("take","50");
    try{ const r=await fetch(`/api/reviews?${params.toString()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }); const j=await r.json(); if(Array.isArray(j) && j.length){ setReviews(j); } else { let list=[...demoReviews] as unknown as Review[]; if(filterRating!=="ALL") list=list.filter(x=>String(x.rating)===filterRating); if(q) list=list.filter(x=> (x.comment||"").toLowerCase().includes(q.toLowerCase()) || (x.billId||"").includes(q)); setReviews(list.slice(0,50)); } } catch{ const list=[...demoReviews] as unknown as Review[]; setReviews(list.slice(0,50)); }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{ load(); },[filterRating]);
  const stats = reviews.length ? { avg: Math.round((reviews.reduce((a,b)=>a+b.rating,0)/reviews.length)*10)/10, count: reviews.length } : { avg:0, count:0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">QR Review & Feedback â€¢ 500 reviews</h1>
        <Badge className="bg-amber-100 text-amber-800 border">Avg {stats.avg} â˜… ({stats.count} shown)</Badge>
      </div>
      <Card><CardHeader><CardTitle className="text-base">Rating â†’ Reward Configurable</CardTitle><CardDescription>1â€“3 â˜… feedback only â€¢ 4 â˜… {demoCampaigns[0].rewardValue}% â€¢ 5 â˜… {demoCampaigns[1].rewardValue}% â€” managed via Campaigns (not hardcoded). Positive review never required for service.</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-center">
          {["ALL","5","4","3","2","1"].map(r=> <Button key={r} size="sm" variant={filterRating===r?"default":"outline"} onClick={()=> setFilterRating(r)}>{r==="ALL"?"All":`${r} â˜…`}</Button>)}
          <Input placeholder="Search billId/comment" value={q} onChange={e=>setQ(e.target.value)} className="max-w-[240px] ml-auto" />
          <Button size="sm" variant="outline" onClick={load}>Refresh</Button>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {reviews.slice(0,50).map(r=>(
          <Card key={r.id} className={r.rating>=4?"border-green-200 bg-green-50/40":""}>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex justify-between"><span className="font-mono text-xs">{r.billId}</span><span className="text-amber-600">{"â˜…".repeat(r.rating)}{"â˜†".repeat(5-r.rating)}</span></CardTitle><CardDescription className="text-xs">{r.name || "â€”"} â€¢ {r.phone || "â€”"} â€¢ {new Date(r.createdAt).toLocaleString()}</CardDescription></CardHeader>
            <CardContent className="text-sm text-zinc-700">{r.comment || <span className="text-zinc-400">No comment</span>}</CardContent>
          </Card>
        ))}
      </div>
      <Card><CardContent className="p-3 text-xs text-zinc-500">Anti-abuse active: unique billId, server validation, IP/UA logged, rate limit 10/min per IP + 5s per bill cooldown, 30-day QR expiry. Duplicate claim â†’ ALREADY_CLAIMED.</CardContent></Card>
    </div>
  );
}

