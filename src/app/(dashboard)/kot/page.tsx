"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type KOTItem = { id:string; name:string; menuItemId:string; quantity:number; notes:string; status:string };
type KOT = { id:string; kotNumber:string; orderId:string; orderNumber:string; table:string; customer:string; customerPhone:string; status:string; priority:number; notes?:string; createdAt:string; updatedAt:string; items: KOTItem[] };

const statusColors: Record<string,string> = { NEW:"bg-zinc-100 text-zinc-800 border", ACCEPTED:"bg-blue-100 text-blue-800 border-blue-200", PREPARING:"bg-amber-100 text-amber-800 border-amber-200", READY:"bg-green-100 text-green-800 border-green-200", SERVED:"bg-emerald-100 text-emerald-800 border-emerald-200", COMPLETED:"bg-zinc-900 text-white", CANCELLED:"bg-red-100 text-red-700 border-red-200" };
const nextMap: Record<string,string[]> = { NEW:["ACCEPTED"], ACCEPTED:["PREPARING"], PREPARING:["READY"], READY:["SERVED","COMPLETED"], SERVED:["COMPLETED"], COMPLETED:[], CANCELLED:[] };
const allStatuses = ["ALL","NEW","ACCEPTED","PREPARING","READY","SERVED","COMPLETED","CANCELLED"] as const;

function elapsedMin(createdAt:string){ return Math.floor((Date.now() - new Date(createdAt).getTime())/60000); }
function delayClass(k:KOT){
  const m=elapsedMin(k.createdAt);
  if (["READY","SERVED","COMPLETED","CANCELLED"].includes(k.status)) return "";
  if (m>30) return "border-red-400 bg-red-50 dark:bg-red-950/20";
  if (m>15) return "border-amber-400 bg-amber-50 dark:bg-amber-950/20";
  if (m>8) return "border-amber-200";
  return "";
}

export default function KOTPage(){
  const [kots, setKots] = useState<KOT[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [auto, setAuto] = useState(true);
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState<KOT|null>(null);
  const [cancelReason, setCancelReason] = useState<Record<string,string>>({});
  const [tick, setTick] = useState(0);

  const [loading, setLoading] = useState(true);
  const load = useCallback(async()=>{
    setLoading(true);
    const q=new URLSearchParams();
    if(filter!=="ALL") q.set("status",filter);
    if(priorityFilter!=="ALL") q.set("priority",priorityFilter);
    try{
      const r=await fetch(`/api/kots?${q.toString()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }); const j=await r.json();
      if(Array.isArray(j) && j.length) {
        setKots(j);
      } else if(Array.isArray(j) && !j.length){
        // Only fallback to demo when unfiltered and DB truly empty — not for filtered empty (stale cache fix)
        if(filter==="ALL" && priorityFilter==="ALL"){
          try {
            const resAll = await fetch('/api/kots', { cache: 'no-store' }); const jAll = await resAll.json();
            if(Array.isArray(jAll) && jAll.length===0){
              const { demoKOTs } = await import("@/data/demo");
              setKots(demoKOTs as unknown as KOT[]);
            } else {
              setKots([]); // filtered empty is valid — don't show stale demo
            }
          } catch { setKots([]); }
        } else {
          setKots([]); // filtered empty — show correct empty, not demo
        }
      } else if(Array.isArray(j)) setKots(j);
    } catch {
      setKots([]);
    } finally { setLoading(false); }
  },[filter, priorityFilter]);

  // initial + route-change reload
  useEffect(()=>{ load(); },[load]);
  // focus + visibility reload (fix navigation stale without refresh)
  useEffect(()=>{
    const onVis = ()=>{ if(document.visibilityState==='visible') load(); };
    const onFocus = ()=> load();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return ()=>{ window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVis); };
  },[load]);
  useEffect(()=>{ if(!auto) return; const id=setInterval(load, 15000); return ()=>clearInterval(id); },[auto, load]);
  useEffect(()=>{ const id=setInterval(()=> setTick(t=>t+1), 60000); return ()=>clearInterval(id); },[]);
  void tick;

  async function advance(k:KOT, next:string){
    const res=await fetch(`/api/kots/${k.id}`,{ method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ status: next })});
    if(!res.ok){ const j=await res.json().catch(()=>({})); setMsg(j.error||"Transition failed"); return; }
    setMsg(`${k.kotNumber} ${k.status} â†’ ${next}`);
    load();
  }
  async function cancelItem(kotId:string, itemId:string){
    const reason=cancelReason[itemId];
    if(!reason || reason.trim().length<3){ setMsg("Provide cancel reason (â‰¥3 chars)"); return; }
    const res=await fetch(`/api/kots/${kotId}`,{ method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ itemId, reason })});
    if(!res.ok){ const j=await res.json().catch(()=>({})); setMsg(j.error||"Cancel failed"); return; }
    setMsg("Item cancelled");
    setCancelReason(prev=> ({ ...prev, [itemId]:"" }));
    load();
    if(selected?.id===kotId){ const r=await fetch(`/api/kots/${kotId}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }); const j=await r.json(); if(j?.id) setSelected(j); }
  }

  const counts = allStatuses.reduce((acc,s)=>{ if(s==="ALL") acc[s]=kots.length; else acc[s]=kots.filter(k=>k.status===s).length; return acc; },{} as Record<string,number>);
  const urgent = kots.filter(k=> k.priority===2 && ["NEW","ACCEPTED","PREPARING"].includes(k.status)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">KOT & Kitchen Display</h1>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)} /> Auto refresh 15s</label>
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
          <Button size="sm" onClick={()=> window.print()} className="print:hidden">Print KDS</Button>
        </div>
      </div>
      {msg && <div className="text-sm bg-amber-50 border border-amber-200 rounded p-2">{msg}</div>}
      <div className="flex flex-wrap gap-2 items-center">
        {allStatuses.map(s=> <button key={s} onClick={()=> setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filter===s? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900":"bg-white dark:bg-zinc-900 hover:bg-zinc-50"}`}>{s} {s!=="ALL"?`(${counts[s]||0})`:`(${kots.length})`}</button>)}
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span>Priority</span>
          <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} className="border rounded h-7 px-2 text-xs"><option value="ALL">All</option><option value="2">Urgent (2)</option><option value="1">High (1)</option><option value="0">Normal (0)</option></select>
          {urgent>0 && <Badge className="bg-red-600 text-white animate-pulse">{urgent} urgent</Badge>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading? Array.from({length:6}).map((_,i)=>(<Card key={i} className="animate-pulse"><CardHeader className="pb-2"><div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" /><div className="h-3 w-32 bg-zinc-100 dark:bg-zinc-800 rounded mt-2" /></CardHeader><CardContent className="space-y-2"><div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded" /><div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded" /></CardContent></Card>))
        : kots.length===0? <Card className="col-span-full"><CardContent className="p-8 text-center text-sm text-zinc-500">No KOTs for this filter — place an order via POS to generate a KOT (item routing to kitchen).</CardContent></Card> :
          kots.map(k=>{
            const mins=elapsedMin(k.createdAt);
            const delay= mins>30?"ðŸ”´ >30m delayed": mins>15?"ðŸŸ¡ >15m": mins>8?"•":"";
            return (
              <Card key={k.id} className={`${delayClass(k)} ${k.priority===2?"ring-2 ring-red-300":""} flex flex-col`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <CardTitle className="text-sm font-mono">{k.kotNumber}</CardTitle>
                      <CardDescription className="text-xs">{k.orderNumber} • Table {k.table} • {k.customer} <span className="text-zinc-400">{k.customerPhone}</span></CardDescription>
                    </div>
                    <Badge className={`border ${statusColors[k.status]||"bg-zinc-100"}`}>{k.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center text-xs text-zinc-500">
                    <span>{new Date(k.createdAt).toLocaleTimeString()} • {mins}m ago {delay}</span>
                    {k.priority===2? <Badge className="bg-red-600 text-white">URGENT</Badge> : k.priority===1? <Badge className="bg-amber-500 text-white">High</Badge> : <Badge className="border bg-white">Normal</Badge>}
                  </div>
                  {k.notes && <div className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1">Note: {k.notes}</div>}
                </CardHeader>
                <CardContent className="space-y-3 flex-1 flex flex-col">
                  <div className="space-y-2">
                    {k.items.map(it=>(
                      <div key={it.id} className={`flex gap-2 items-start border rounded p-2 ${it.status==="CANCELLED"?"opacity-50 line-through bg-red-50":"bg-white dark:bg-zinc-900"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{it.name} <span className="text-zinc-500">Ã—{it.quantity}</span> {it.status==="CANCELLED" && <span className="text-red-600 text-xs">CANCELLED</span>}</div>
                          {it.notes && <div className="text-xs text-amber-700 bg-amber-50 rounded px-1 mt-1">â€œ{it.notes}â€</div>}
                        </div>
                        {it.status!=="CANCELLED" && ["NEW","ACCEPTED","PREPARING"].includes(k.status) && (
                          <div className="shrink-0 flex flex-col gap-1">
                            <Input placeholder="Reason" value={cancelReason[it.id]||""} onChange={e=> setCancelReason(prev=> ({...prev, [it.id]:e.target.value}))} className="h-6 text-xs w-[120px]" />
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-red-600" onClick={()=> cancelItem(k.id, it.id)}>Cancel item</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 mt-auto">
                    {(nextMap[k.status]||[]).map(n=> <Button key={n} size="sm" className="h-7 text-xs" onClick={()=> advance(k,n)}>{n}</Button>)}
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=> setSelected(k)}>Details</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=> window.print()}>Print</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        }
      </div>

      <Card className="print:hidden"><CardContent className="p-3 text-xs text-zinc-500">Workflow: NEW â†’ ACCEPTED â†’ PREPARING â†’ READY â†’ SERVED/COMPLETED. Delay indicator: &gt;15m amber, &gt;30m red + bg. Priority 2 = urgent. Item cancel requires reason; if all items cancelled KOT auto CANCELLED. Order status syncs to KOT (CONFIRMED/PREPARING/READY/SERVED/COMPLETED). Kitchen roles: CHEF, KITCHEN_STAFF, KITCHEN_MANAGER, MANAGER, OWNER can transition (enforced API).</CardContent></Card>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 print:hidden" onClick={()=> setSelected(null)}>
          <Card className="w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e=>e.stopPropagation()}>
            <CardHeader><CardTitle>Print-ready KOT • {selected.kotNumber}</CardTitle><CardDescription>{selected.orderNumber} • {selected.table} • {selected.customer} • {new Date(selected.createdAt).toLocaleString()}</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div id="kot-print" className="space-y-2 font-mono text-sm border rounded p-3 bg-white">
                <div className="text-center font-bold border-b pb-2">KOT {selected.kotNumber}<br/><span className="font-normal text-xs">Order {selected.orderNumber} • Table {selected.table}</span></div>
                <div>Customer: {selected.customer} ({selected.customerPhone})</div>
                <div>Priority: {selected.priority===2?"URGENT": selected.priority===1?"High":"Normal"} • Status: {selected.status}</div>
                <div>Time: {new Date(selected.createdAt).toLocaleString()} • {elapsedMin(selected.createdAt)}m ago</div>
                <div className="border-t my-2" />
                {selected.items.map(it=> <div key={it.id} className="flex justify-between"><span>{it.name} Ã—{it.quantity}{it.notes?` (${it.notes})`:""} {it.status==="CANCELLED"?"[CANCELLED]":""}</span></div>)}
                <div className="border-t pt-2 text-xs text-center">Kitchen copy — routing: all items to hot section</div>
              </div>
              <Button className="w-full" onClick={()=> window.print()}>Print KOT</Button>
              <Button variant="outline" className="w-full" onClick={()=> setSelected(null)}>Close</Button>
            </CardContent>
          </Card>
        </div>
      )}

      <style>{`@media print { body *{ visibility:hidden } #kot-print, #kot-print *{ visibility:visible } #kot-print{ position:absolute; left:0; top:0; width:100% } }`}</style>
    </div>
  );
}

