"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { demoCustomers } from "@/data/demo";
import { PaymentHistory } from "@/components/customers/PaymentHistory";

type Customer = { id:string; name:string; phone:string; email?:string|null; birthday?:string|null; marketingConsent:boolean; totalVisits:number; totalSpend:number; loyaltyPoints:number; createdAt:string; _counts?:{bills:number; reviews:number; loyalty:number; coupons:number} };
type Detail = Customer & { bills: unknown[]; reviews: unknown[]; loyaltyTxs: unknown[]; coupons: unknown[]; orders: unknown[] };

export default function CustomersPage(){
  const [q,setQ]=useState("");
  const [list,setList]=useState<Customer[]>([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState<Detail|null>(null);
  const [activeTab,setActiveTab]=useState<"overview"|"orders"|"payments"|"loyalty"|"coupons">("overview");
  const [showCreate,setShowCreate]=useState(false);
  const [form,setForm]=useState({ name:"", phone:"", email:"", birthday:"", marketingConsent:false });
  const [sortBy,setSortBy]=useState<"name"|"totalVisits"|"totalSpend"|"loyaltyPoints"|"createdAt">("totalSpend");
  const [sortOrder,setSortOrder]=useState<"asc"|"desc">("desc");

  async function load(){
    setLoading(true);
    try{
      const r=await fetch(`/api/customers?q=${encodeURIComponent(q)}&take=20`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      const j=await r.json();
      let data: Customer[] = [];
      let tot = 0;
      if(j.data && Array.isArray(j.data) && j.data.length) { data = j.data; tot = j.total ?? j.data.length; }
      else if(Array.isArray(j) && j.length) { data = j; tot = j.length; }
      // fallback to demo when DB empty or stale filter (POS parity) — ensures Customers/CRM not empty
      if(!data.length){
        const filtered=demoCustomers.filter(c=> !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q)).slice(0,20) as unknown as Customer[];
        data = filtered; tot = q ? filtered.length : demoCustomers.length;
      }
      setList(data); setTotal(tot);
    } catch { const filtered=demoCustomers.filter(c=> !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q)).slice(0,20) as unknown as Customer[]; setList(filtered); setTotal(demoCustomers.length); }
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{ load(); },[]);
  useEffect(()=>{ const t=setTimeout(load,400); return ()=>clearTimeout(t); },[q]);
  // auto-refresh when POS created a bill (fixes stale Visits 0 after order)
  useEffect(()=>{
    const check=()=>{
      try{ if(localStorage.getItem("crm_refresh_needed")==="1"){ localStorage.removeItem("crm_refresh_needed"); load(); } }catch{}
    };
    check();
    window.addEventListener("focus", check);
    const onStorage=(e: StorageEvent)=>{ if(e.key==="crm_refresh_needed") check(); };
    window.addEventListener("storage", onStorage);
    // also poll once after mount for Vercel delayed DB
    const t=setTimeout(check, 1500);
    return ()=>{ window.removeEventListener("focus", check); window.removeEventListener("storage", onStorage); clearTimeout(t); };
  },[]);

  async function open(id:string){
    try{ const r=await fetch(`/api/customers/${id}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }); const j=await r.json(); setSelected(j); setActiveTab("overview"); } catch{ const c=demoCustomers.find(x=>x.id===id) as unknown as Detail; setSelected(c as Detail); setActiveTab("overview"); }
  }
  async function create(){
    if(!form.name || !form.phone){ alert("Name and phone required"); return; }
    const r=await fetch("/api/customers",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(form)});
    if(r.ok){ setShowCreate(false); setForm({ name:"", phone:"", email:"", birthday:"", marketingConsent:false }); load(); }
    else { const j=await r.json(); alert(j.error||"Failed"); }
  }

  // sorted list for display
  const sortedList = [...list].sort((a,b)=>{
    const dir = sortOrder==="asc"?1:-1;
    if(sortBy==="name") return dir * a.name.localeCompare(b.name);
    if(sortBy==="totalVisits") return dir * (a.totalVisits - b.totalVisits);
    if(sortBy==="totalSpend") return dir * (a.totalSpend - b.totalSpend);
    if(sortBy==="loyaltyPoints") return dir * (a.loyaltyPoints - b.loyaltyPoints);
    if(sortBy==="createdAt") return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return 0;
  });
  const currentCustomer = sortedList[0] || list[0];
  const recentlyUpdated = [...list].sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Customer CRM â€¢ {total} customers</h1>
        <Button onClick={()=> setShowCreate(v=>!v)}>{showCreate?"Close":"+ New Customer"}</Button>
      </div>
      {/* Current / Recent customer — top bar for current data */}
      {recentlyUpdated && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">ðŸŸ¢ Current / Recent Customer — Live CRM</CardTitle><CardDescription>Most recently updated — after POS bill, refresh to see new entry</CardDescription></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4 text-sm">
            <div><div className="text-xs text-zinc-500">Name</div><div className="font-bold">{recentlyUpdated.name}</div><div className="text-xs">{recentlyUpdated.phone}</div></div>
            <div><div className="text-xs text-zinc-500">Visits / Spend</div><div className="font-bold">{recentlyUpdated.totalVisits} visits â€¢ ₹{Math.round(recentlyUpdated.totalSpend)}</div><div className="text-xs">Points {recentlyUpdated.loyaltyPoints}</div></div>
            <div><div className="text-xs text-zinc-500">B/T</div><div>{recentlyUpdated._counts? `${recentlyUpdated._counts.bills}B/${recentlyUpdated._counts.reviews}R` : "—"}</div><div className="text-xs">{recentlyUpdated.email||"—"}</div></div>
            <div className="flex items-end"><Button size="sm" variant="outline" onClick={()=> open(recentlyUpdated.id)}>View Profile</Button></div>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Search name / phone / email" value={q} onChange={e=>setQ(e.target.value)} className="max-w-md" />
        <span className="text-sm text-zinc-500 self-center">{total} total</span>
        <div className="ml-auto flex gap-2 items-center">
          <select value={sortBy} onChange={e=>setSortBy(e.target.value as never)} className="border rounded h-8 px-2 text-xs bg-white dark:bg-zinc-900">
            <option value="totalSpend">Spend</option><option value="totalVisits">Visits</option><option value="loyaltyPoints">Points</option><option value="name">Name</option><option value="createdAt">Recent</option>
          </select>
          <Button size="sm" variant="outline" onClick={()=> setSortOrder(o=> o==="asc"?"desc":"asc")} className="h-8">{sortOrder==="asc"?"â†‘ Asc":"â†“ Desc"}</Button>
          <Button size="sm" variant="outline" onClick={load} className="h-8">Refresh</Button>
        </div>
      </div>
      {showCreate && <Card><CardHeader><CardTitle className="text-base">New Customer</CardTitle><CardDescription>Mobile is unique per restaurant â€¢ birthday for offers â€¢ marketing consent</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
        <div><Label>Name*</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
        <div><Label>Mobile* (10 digits)</Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="9876543210" /></div>
        <div><Label>Email</Label><Input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com" /></div>
        <div><Label>Birthday</Label><Input type="date" value={form.birthday} onChange={e=>setForm({...form,birthday:e.target.value})} /></div>
        <label className="flex items-center gap-2 text-sm col-span-2"><input type="checkbox" checked={form.marketingConsent} onChange={e=>setForm({...form,marketingConsent:e.target.checked})} /> Marketing consent</label>
        <Button onClick={create} className="col-span-2">Create</Button>
      </CardContent></Card>}

      <div className="rounded border bg-white dark:bg-zinc-900 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800 text-xs"><tr>
            <th className="p-2 text-left cursor-pointer" onClick={()=>{setSortBy("name"); setSortOrder(o=>o==="asc"?"desc":"asc")}}>Name {sortBy==="name"? sortOrder==="asc"?"â†‘":"â†“":""}</th>
            <th className="p-2 text-left">Mobile</th>
            <th className="p-2 cursor-pointer" onClick={()=>{setSortBy("totalVisits"); setSortOrder(o=>o==="asc"?"desc":"asc")}}>Visits {sortBy==="totalVisits"? sortOrder==="asc"?"â†‘":"â†“":""}</th>
            <th className="p-2 cursor-pointer" onClick={()=>{setSortBy("totalSpend"); setSortOrder(o=>o==="asc"?"desc":"asc")}}>Spend {sortBy==="totalSpend"? sortOrder==="asc"?"â†‘":"â†“":""}</th>
            <th className="p-2 cursor-pointer" onClick={()=>{setSortBy("loyaltyPoints"); setSortOrder(o=>o==="asc"?"desc":"asc")}}>Points {sortBy==="loyaltyPoints"? sortOrder==="asc"?"â†‘":"â†“":""}</th>
            <th className="p-2">B/T</th><th className="p-2"></th></tr></thead>
          <tbody>
            {loading? <tr><td colSpan={7} className="p-6 text-center text-zinc-500">Loadingâ€¦</td></tr> :
              sortedList.map(c=>(
                <tr key={c.id} className="border-t hover:bg-zinc-50 dark:hover:bg-zinc-800"><td className="p-2 font-medium">{c.name}<div className="text-xs text-zinc-500">{c.email || "—"} {c.birthday?`â€¢ ${new Date(c.birthday).toLocaleDateString()}`:""}</div></td><td className="p-2">{c.phone}<div className="text-xs">{c.marketingConsent? <Badge className="bg-green-100 text-green-800 text-[10px]">consent</Badge> : <span className="text-zinc-400">no consent</span>}</div></td><td className="p-2 text-center">{c.totalVisits}</td><td className="p-2 text-center">₹{Math.round(c.totalSpend)}</td><td className="p-2 text-center font-bold text-orange-700">{c.loyaltyPoints}</td><td className="p-2 text-center text-xs">{c._counts? `${c._counts.bills}B/${c._counts.reviews}R`:"—"}</td><td className="p-2"><Button size="sm" variant="outline" onClick={()=> open(c.id)}>Profile</Button></td></tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-zinc-500">Visits = paid bills count â€¢ Spend = sum paid â€¢ Points synced from loyaltyAccount â€¢ B/T = Bills/Reviews counts — now recomputed and sorted {sortOrder} by {sortBy}</div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={()=> setSelected(null)}>
          <Card className="w-full max-w-5xl max-h-[92vh] overflow-auto" onClick={e=>e.stopPropagation()}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                <span>{selected.name} â€¢ {selected.phone}</span>
                <Badge className="bg-zinc-900 text-white">Visits {selected.totalVisits} â€¢ Spend ₹{Math.round(selected.totalSpend)} â€¢ Points {selected.loyaltyPoints}</Badge>
              </CardTitle>
              <CardDescription>{selected.email || "—"} {selected.email?" â€¢ ":""}Birthday {selected.birthday? new Date(selected.birthday).toLocaleDateString(): "—"} â€¢ Last Visit {selected.totalVisits? "—" : "—"}</CardDescription>
              {/* Tabs */}
              <div className="flex gap-1 overflow-auto pt-3 border-b -mb-2">
                {[
                  {id:"overview", label:"Overview"},
                  {id:"orders", label:"Orders History"},
                  {id:"payments", label:"Payment History â­"},
                  {id:"loyalty", label:"Loyalty Points"},
                  {id:"coupons", label:"Coupons Used"},
                ].map(t=> (
                  <button key={t.id} onClick={()=> setActiveTab(t.id as never)} className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap ${activeTab===t.id?"border-zinc-900 text-zinc-900":"border-transparent text-zinc-500 hover:text-zinc-700"}`}>{t.label}</button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm pt-4">
              {activeTab==="overview" && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3 text-xs">
                    <div className="border rounded p-3 bg-zinc-50 dark:bg-zinc-900"><div className="text-zinc-500">Total Visits</div><div className="text-xl font-bold">{selected.totalVisits}</div></div>
                    <div className="border rounded p-3 bg-green-50"><div className="text-zinc-500">Total Spend</div><div className="text-xl font-bold">₹{Math.round(selected.totalSpend)}</div></div>
                    <div className="border rounded p-3 bg-orange-50"><div className="text-zinc-500">Loyalty Points</div><div className="text-xl font-bold">{selected.loyaltyPoints}</div></div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold text-xs mb-2">Recent Bills</h4>
                      <div className="space-y-1 max-h-40 overflow-auto text-xs">{(selected.bills as unknown as {billNumber?:string; totalAmount?:number; status?:string}[])?.slice(0,5).map((b,i)=><div key={i} className="border-b py-1 flex justify-between"><span>{(b as {billNumber:string}).billNumber || (b as {id:string}).id}</span><span>₹{(b as {totalAmount:number}).totalAmount||0}</span></div>) || <span className="text-zinc-500">—</span>}</div>
                      <Button size="sm" variant="ghost" className="text-xs mt-1 p-0 h-6" onClick={()=> setActiveTab("payments")}>View Payment History â†’</Button>
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs mb-2">Recent Reviews</h4>
                      <div className="space-y-1 max-h-40 overflow-auto text-xs">{(selected.reviews as unknown as {rating:number; comment?:string}[])?.map((r,i)=><div key={i} className="border-b py-1">{"â˜…".repeat(r.rating)} {r.comment || ""}</div>) || <span className="text-zinc-500">—</span>}</div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab==="orders" && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Orders History</h4>
                  <div className="space-y-1 max-h-[50vh] overflow-auto text-xs">
                    {(selected as unknown as {orders?: {orderNumber:string; status:string; totalAmount:number; createdAt:string}[]}).orders?.map((o,i)=>(
                      <div key={i} className="border rounded p-2 flex justify-between items-center"><span className="font-mono">{o.orderNumber}</span><span>{o.status}</span><span>₹{o.totalAmount}</span><span className="text-zinc-500">{new Date(o.createdAt).toLocaleDateString()}</span></div>
                    )) || (selected.bills as unknown as {billNumber:string; totalAmount:number; createdAt:string}[])?.slice(0,20).map((b,i)=><div key={i} className="border rounded p-2 flex justify-between"><span className="font-mono">{b.billNumber}</span><span>₹{b.totalAmount}</span><span className="text-zinc-500">{new Date(b.createdAt).toLocaleDateString()}</span></div>) || <span className="text-zinc-500">No orders</span>}
                  </div>
                </div>
              )}
              {activeTab==="payments" && (
                <PaymentHistory customerId={selected.id} customerName={selected.name} customerPhone={selected.phone} />
              )}
              {activeTab==="loyalty" && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Loyalty Transactions</h4>
                  <div className="space-y-1 max-h-[50vh] overflow-auto text-xs">{(selected.loyaltyTxs as unknown as {points:number; reason?:string; type:string; createdAt?:string; balanceAfter?:number}[])?.map((l,i)=><div key={i} className={`border rounded p-2 flex justify-between ${l.points>0?"text-green-600":"text-red-600"}`}><span>{l.type} {l.points>0?`+${l.points}`:l.points} â€¢ Bal {l.balanceAfter||"—"}</span><span className="text-zinc-500">{(l as {reason:string}).reason||""} {l.createdAt? new Date(l.createdAt).toLocaleDateString():""}</span></div>) || <span className="text-zinc-500">—</span>}</div>
                </div>
              )}
              {activeTab==="coupons" && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Coupons Used</h4>
                  <div className="space-y-1 max-h-[50vh] overflow-auto text-xs">{(selected.coupons as unknown as {code:string; status:string; value:number; expiryDate?:string; rewardType?:string}[])?.map((c,i)=><div key={i} className="border rounded p-2 flex justify-between"><span className="font-mono">{c.code} â€¢ {c.rewardType||""}</span><span>{c.status} ₹{c.value} {c.expiryDate? `â€¢ exp ${new Date(c.expiryDate).toLocaleDateString()}`:""}</span></div>) || <span className="text-zinc-500">—</span>}</div>
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={()=> setSelected(null)}>Close</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

