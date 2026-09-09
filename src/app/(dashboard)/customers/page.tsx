"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { demoCustomers } from "@/data/demo";

type Customer = { id:string; name:string; phone:string; email?:string|null; birthday?:string|null; marketingConsent:boolean; totalVisits:number; totalSpend:number; loyaltyPoints:number; createdAt:string; _counts?:{bills:number; reviews:number; loyalty:number; coupons:number} };
type Detail = Customer & { bills: unknown[]; reviews: unknown[]; loyaltyTxs: unknown[]; coupons: unknown[]; orders: unknown[] };

export default function CustomersPage(){
  const [q,setQ]=useState("");
  const [list,setList]=useState<Customer[]>([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState<Detail|null>(null);
  const [showCreate,setShowCreate]=useState(false);
  const [form,setForm]=useState({ name:"", phone:"", email:"", birthday:"", marketingConsent:false });

  async function load(){
    setLoading(true);
    try{
      const r=await fetch(`/api/customers?q=${encodeURIComponent(q)}&take=20`);
      const j=await r.json();
      if(j.data) { setList(j.data); setTotal(j.total); }
      else if(Array.isArray(j)) { setList(j); setTotal(j.length); }
    } catch { const filtered=demoCustomers.filter(c=> !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q)).slice(0,20) as unknown as Customer[]; setList(filtered); setTotal(demoCustomers.length); }
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{ load(); },[]);
  useEffect(()=>{ const t=setTimeout(load,400); return ()=>clearTimeout(t); },[q]);

  async function open(id:string){
    try{ const r=await fetch(`/api/customers/${id}`); const j=await r.json(); setSelected(j); } catch{ const c=demoCustomers.find(x=>x.id===id) as unknown as Detail; setSelected(c as Detail); }
  }
  async function create(){
    if(!form.name || !form.phone){ alert("Name and phone required"); return; }
    const r=await fetch("/api/customers",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(form)});
    if(r.ok){ setShowCreate(false); setForm({ name:"", phone:"", email:"", birthday:"", marketingConsent:false }); load(); }
    else { const j=await r.json(); alert(j.error||"Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Customer CRM • 500 customers</h1>
        <Button onClick={()=> setShowCreate(v=>!v)}>{showCreate?"Close":"+ New Customer"}</Button>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Search name / phone / email" value={q} onChange={e=>setQ(e.target.value)} className="max-w-md" />
        <span className="text-sm text-zinc-500 self-center">{total} total</span>
      </div>
      {showCreate && <Card><CardHeader><CardTitle className="text-base">New Customer</CardTitle><CardDescription>Mobile is unique per restaurant • birthday for offers • marketing consent</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
        <div><Label>Name*</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
        <div><Label>Mobile* (10 digits)</Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="9876543210" /></div>
        <div><Label>Email</Label><Input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com" /></div>
        <div><Label>Birthday</Label><Input type="date" value={form.birthday} onChange={e=>setForm({...form,birthday:e.target.value})} /></div>
        <label className="flex items-center gap-2 text-sm col-span-2"><input type="checkbox" checked={form.marketingConsent} onChange={e=>setForm({...form,marketingConsent:e.target.checked})} /> Marketing consent</label>
        <Button onClick={create} className="col-span-2">Create</Button>
      </CardContent></Card>}

      <div className="rounded border bg-white dark:bg-zinc-900 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800 text-xs"><tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Mobile</th><th className="p-2">Visits</th><th className="p-2">Spend</th><th className="p-2">Points</th><th className="p-2">B/T</th><th className="p-2"></th></tr></thead>
          <tbody>
            {loading? <tr><td colSpan={7} className="p-6 text-center text-zinc-500">Loading…</td></tr> :
              list.map(c=>(
                <tr key={c.id} className="border-t hover:bg-zinc-50 dark:hover:bg-zinc-800"><td className="p-2 font-medium">{c.name}<div className="text-xs text-zinc-500">{c.email || "—"} {c.birthday?`• ${new Date(c.birthday).toLocaleDateString()}`:""}</div></td><td className="p-2">{c.phone}<div className="text-xs">{c.marketingConsent? <Badge className="bg-green-100 text-green-800 text-[10px]">consent</Badge> : <span className="text-zinc-400">no consent</span>}</div></td><td className="p-2 text-center">{c.totalVisits}</td><td className="p-2 text-center">₹{Math.round(c.totalSpend)}</td><td className="p-2 text-center">{c.loyaltyPoints}</td><td className="p-2 text-center text-xs">{c._counts? `${c._counts.bills}B/${c._counts.reviews}R`:"—"}</td><td className="p-2"><Button size="sm" variant="outline" onClick={()=> open(c.id)}>Profile</Button></td></tr>
              ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={()=> setSelected(null)}>
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto" onClick={e=>e.stopPropagation()}>
            <CardHeader><CardTitle>{selected.name} • {selected.phone}</CardTitle><CardDescription>{selected.email || "—"} • Birthday {selected.birthday? new Date(selected.birthday).toLocaleDateString(): "—"} • Visits {selected.totalVisits} • Spend ₹{Math.round(selected.totalSpend)} • Points {selected.loyaltyPoints}</CardDescription></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold">Bills (recent)</h4>
                  <div className="space-y-1 max-h-40 overflow-auto text-xs">{(selected.bills as unknown as {billNumber?:string; totalAmount?:number; status?:string}[])?.slice(0,10).map((b,i)=><div key={i} className="border-b py-1 flex justify-between"><span>{(b as {billNumber:string}).billNumber || (b as {id:string}).id}</span><span>₹{(b as {totalAmount:number}).totalAmount||0}</span></div>) || <span className="text-zinc-500">—</span>}</div>
                </div>
                <div>
                  <h4 className="font-semibold">Reviews</h4>
                  <div className="space-y-1 max-h-40 overflow-auto text-xs">{(selected.reviews as unknown as {rating:number; comment?:string}[])?.map((r,i)=><div key={i} className="border-b py-1">{"★".repeat(r.rating)} {r.comment || ""}</div>) || <span className="text-zinc-500">—</span>}</div>
                </div>
                <div>
                  <h4 className="font-semibold">Loyalty Transactions</h4>
                  <div className="space-y-1 max-h-40 overflow-auto text-xs">{(selected.loyaltyTxs as unknown as {points:number; reason?:string; type:string}[])?.map((l,i)=><div key={i} className={`border-b py-1 flex justify-between ${l.points>0?"text-green-600":"text-red-600"}`}><span>{l.type} {l.points>0?`+${l.points}`:l.points}</span><span className="text-zinc-500">{(l as {reason:string}).reason||""}</span></div>) || <span className="text-zinc-500">—</span>}</div>
                </div>
                <div>
                  <h4 className="font-semibold">Coupons</h4>
                  <div className="space-y-1 max-h-40 overflow-auto text-xs">{(selected.coupons as unknown as {code:string; status:string; value:number}[])?.map((c,i)=><div key={i} className="border-b py-1 flex justify-between"><span className="font-mono">{c.code}</span><span>{c.status} ₹{c.value}</span></div>) || <span className="text-zinc-500">—</span>}</div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={()=> setSelected(null)}>Close</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
