"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { demoTables } from "@/data/demo";

type Table = { id:string; number:string; capacity:number; floor:string; area?:string|null; status:"AVAILABLE"|"OCCUPIED"|"RESERVED"|"BILLING"|"CLEANING"; qrToken:string; };

const color: Record<string,string> = { AVAILABLE:"bg-green-100 text-green-800 border-green-200", OCCUPIED:"bg-red-100 text-red-800 border-red-200", RESERVED:"bg-amber-100 text-amber-800 border-amber-200", BILLING:"bg-purple-100 text-purple-800 border-purple-200", CLEANING:"bg-blue-100 text-blue-800 border-blue-200" };

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ number:"", capacity:4, floor:"Ground", area:"Indoor", status:"AVAILABLE" as Table["status"] });

  async function load() {
    setLoading(true);
    try { const r=await fetch("/api/tables"); const j=await r.json(); setTables(Array.isArray(j)? j: demoTables as unknown as Table[]); } catch { setTables(demoTables as unknown as Table[]); }
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{ load(); }, []);

  async function createTable() {
    if(!form.number.trim()){ setMsg("Table number required"); return; }
    const res=await fetch("/api/tables",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(form)});
    if(res.ok){ setShowForm(false); setForm({ number:"", capacity:4, floor:"Ground", area:"Indoor", status:"AVAILABLE"}); setMsg("Table created with unique qrToken"); load(); } else { const j=await res.json(); setMsg(j.error||"Failed — number must be unique per restaurant"); }
  }
  async function updateStatus(id:string, status: Table["status"]) {
    const prev=tables;
    setTables(t=> t.map(x=> x.id===id? {...x, status}:x));
    const res=await fetch(`/api/tables/${id}`,{ method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ status })});
    if(!res.ok){ setTables(prev); setMsg("Failed to update status"); } else setMsg(`Table ${id} → ${status}`);
  }
  async function del(id:string) {
    if(!confirm("Delete table?")) return;
    const res=await fetch(`/api/tables/${id}`,{ method:"DELETE"});
    if(res.ok){ setTables(t=> t.filter(x=> x.id!==id)); setMsg("Deleted"); } else { const j=await res.json().catch(()=>({})); setMsg(j.error||"Delete failed (may have linked orders)"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tables & QR</h1>
        <Button onClick={()=> setShowForm(v=>!v)}>{showForm?"Close":"+ New Table"}</Button>
      </div>
      {msg && <div className="text-sm bg-zinc-50 border rounded p-2">{msg}</div>}
      {showForm && <Card><CardHeader><CardTitle className="text-base">New Table</CardTitle><CardDescription>Number unique per restaurant + floor/area + capacity</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-5">
        <div><Label>Number*</Label><Input value={form.number} onChange={e=>setForm({...form, number:e.target.value})} placeholder="T-31" /></div>
        <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e=>setForm({...form, capacity:Number(e.target.value)})} /></div>
        <div><Label>Floor</Label><Input value={form.floor} onChange={e=>setForm({...form, floor:e.target.value})} /></div>
        <div><Label>Area</Label><select value={form.area} onChange={e=>setForm({...form, area:e.target.value})} className="w-full border rounded h-9 px-3 text-sm"><option>Indoor</option><option>Outdoor</option><option>Patio</option><option>Rooftop</option></select></div>
        <div className="flex items-end"><Button onClick={createTable} className="w-full">Create</Button></div>
      </CardContent></Card>}

      <div className="flex gap-2 text-xs">
        {Object.keys(color).map(s=> <span key={s} className={`px-2 py-1 rounded-full border ${color[s]}`}>{s}</span>)}
        <span className="ml-auto text-zinc-500">{tables.length} tables • 30 demo</span>
      </div>

      {loading? <div className="text-sm text-zinc-500">Loading…</div> : (
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
          {tables.map(t=>(
            <Card key={t.id} className="relative">
              <CardContent className="p-4 space-y-2 text-center">
                <div className="font-bold text-lg">{t.number}</div>
                <div className="text-xs text-zinc-500">{t.floor} • {t.area || "—"} • {t.capacity} pax</div>
                <Badge className={`border ${color[t.status]}`}>{t.status}</Badge>
                <select value={t.status} onChange={e=> updateStatus(t.id, e.target.value as Table["status"])} className="w-full border rounded h-7 text-xs px-1">
                  <option>AVAILABLE</option><option>OCCUPIED</option><option>RESERVED</option><option>BILLING</option><option>CLEANING</option>
                </select>
                <div className="text-[10px] break-all text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded p-1">{t.qrToken}</div>
                <a href={`/qr/${t.qrToken}`} className="text-xs underline">View QR</a>
                <div className="flex gap-1 justify-center pt-1">
                  <button onClick={()=> navigator.clipboard?.writeText(t.qrToken)} className="text-[11px] underline">Copy token</button>
                  <span className="text-zinc-300">•</span>
                  <button onClick={()=> del(t.id)} className="text-[11px] text-red-600 underline">Delete</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Card><CardContent className="p-4 text-xs text-zinc-500">QR token is unique per table + per paid bill (Bill.qrToken). Table QR for dine-in ordering; Bill QR for reward — both server-validated. Print-ready via browser print.</CardContent></Card>
    </div>
  );
}
