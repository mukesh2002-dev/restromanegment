/* eslint-disable react-hooks/purity */
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type InvItem = { id:string; sku:string; name:string; category:string; unit:string; currentStock:number; reorderLevel:number; costPerUnit:number; supplierId?:string|null; supplier?:{name:string}; batchNumber?:string|null; expiryDate?:string|null; isActive?:boolean };
type Supplier = { id:string; name:string; contactName?:string; phone?:string; email?:string; address?:string; gstin?:string; isActive:boolean };
type Tx = { id:string; inventoryItemId:string; inventoryItem?:{name:string; sku:string}; type:string; quantity:number; unitCost?:number; reference?:string; createdAt:string };
type PO = { id:string; poNumber:string; supplierId:string; supplier?:{name:string}; status:string; totalAmount:number; notes?:string; items?:{inventoryItemId:string; quantity:number; unitCost:number; totalCost:number; inventoryItem?:{name:string}}[]; createdAt:string; orderedAt?:string; receivedAt?:string };

const categories = ["ALL","Ingredients","Beverages","Packaging","Cleaning supplies","Other stock"] as const;
const units = ["KG","G","LTR","ML","PCS","BOX","PACK"] as const;

export default function InventoryPage(){
  const [tab,setTab]=useState<"items"|"transactions"|"suppliers"|"purchasing"|"alerts">("items");
  const [items,setItems]=useState<InvItem[]>([]);
  const [suppliers,setSuppliers]=useState<Supplier[]>([]);
  const [txs,setTxs]=useState<Tx[]>([]);
  const [pos,setPos]=useState<PO[]>([]);
  const [q,setQ]=useState("");
  const [cat,setCat]=useState<string>("ALL");
  const [msg,setMsg]=useState("");
  const [showItemForm,setShowItemForm]=useState(false);
  const [itemForm,setItemForm]=useState<Partial<InvItem>>({ name:"", category:"Ingredients", unit:"KG", currentStock:20, reorderLevel:10, costPerUnit:100 });
  const [showTxForm,setShowTxForm]=useState(false);
  const [txForm,setTxForm]=useState({ inventoryItemId:"", type:"PURCHASE" as Tx["type"], quantity:10, reference:"" });
  const [showSupForm,setShowSupForm]=useState(false);
  const [supForm,setSupForm]=useState({ name:"", contactName:"", phone:"", email:"" });
  const [showPOForm,setShowPOForm]=useState(false);
  const [poForm,setPoForm]=useState({ supplierId:"", notes:"", items:[{ inventoryItemId:"", quantity:10, unitCost:100 }] });

  async function loadItems(){
    const params=new URLSearchParams();
    if(cat!=="ALL") params.set("category",cat);
    if(q) params.set("q",q);
    params.set("take","100");
    try{
      const r=await fetch(`/api/inventory?${params.toString()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      const j=await r.json();
      if(Array.isArray(j)) setItems(j);
    } catch{}
  }
  async function loadSuppliers(){ try{ const r=await fetch("/api/suppliers", { cache: 'no-store' }); const j=await r.json(); if(Array.isArray(j)) setSuppliers(j); } catch{} }
  async function loadTx(){ try{ const r=await fetch("/api/inventory/transactions?take=50", { cache: 'no-store' }); const j=await r.json(); if(Array.isArray(j)) setTxs(j); } catch{} }
  async function loadPO(){ try{ const r=await fetch("/api/purchase-orders?take=20", { cache: 'no-store' }); const j=await r.json(); if(Array.isArray(j)) setPos(j); } catch{} }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{ loadItems(); },[cat]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{ loadSuppliers(); loadTx(); loadPO(); },[]);
  useEffect(()=>{ const t=setTimeout(loadItems,400); return ()=>clearTimeout(t); },[q]);

  const alerts = {
    low: items.filter(i=> i.currentStock>0 && i.currentStock < i.reorderLevel),
    out: items.filter(i=> i.currentStock===0),
    nearExpiry: items.filter(i=> i.expiryDate && new Date(i.expiryDate).getTime() < Date.now()+14*86400000 && new Date(i.expiryDate).getTime() > Date.now()),
    expired: items.filter(i=> i.expiryDate && new Date(i.expiryDate).getTime() < Date.now()),
  };

  async function createItem(){
    if(!itemForm.name){ setMsg("Name required"); return; }
    const res=await fetch("/api/inventory",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(itemForm)});
    if(res.ok){ setMsg("Item created — service separate from POS"); setShowItemForm(false); loadItems(); } else { const j=await res.json(); setMsg(j.error||"Failed"); }
  }
  async function createTx(){
    if(!txForm.inventoryItemId){ setMsg("Select item"); return; }
    const res=await fetch("/api/inventory/transactions",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(txForm)});
    if(res.ok){ setMsg(`Transaction ${txForm.type} recorded — stock auto-updated`); setShowTxForm(false); loadItems(); loadTx(); } else { const j=await res.json(); setMsg(j.error||"Failed"); }
  }
  async function createSupplier(){
    if(!supForm.name){ setMsg("Supplier name required"); return; }
    const res=await fetch("/api/suppliers",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(supForm)});
    if(res.ok){ setMsg("Supplier created"); setShowSupForm(false); loadSuppliers(); } else { const j=await res.json(); setMsg(j.error||"Failed"); }
  }
  async function createPO(){
    if(!poForm.supplierId){ setMsg("Select supplier"); return; }
    const payload={ supplierId: poForm.supplierId, notes: poForm.notes, items: poForm.items.filter(i=> i.inventoryItemId).map(i=> ({ inventoryItemId:i.inventoryItemId, quantity:Number(i.quantity), unitCost:Number(i.unitCost) })) };
    if(payload.items.length===0){ setMsg("Add at least one item"); return; }
    const res=await fetch("/api/purchase-orders",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(payload)});
    if(res.ok){ setMsg("Purchase order created — DRAFT â†’ ORDERED â†’ RECEIVED (goods received) â†’ INVOICED"); setShowPOForm(false); loadPO(); } else { const j=await res.json(); setMsg(j.error||"Failed"); }
  }
  async function advancePO(id:string, status:string){
    const res=await fetch(`/api/purchase-orders/${id}`,{ method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ status })});
    if(res.ok){ setMsg(`PO ${status}`); loadPO(); loadItems(); loadTx(); } else { const j=await res.json(); setMsg(j.error||"Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Inventory & Purchasing</h1>
        <Badge className="bg-zinc-900 text-white">500 items â€¢ service separate for POS recipes</Badge>
      </div>
      {msg && <div className="text-sm bg-amber-50 border border-amber-200 rounded p-2">{msg}</div>}

      <div className="grid gap-3 md:grid-cols-4">
        <Card className={alerts.low.length? "border-amber-300 bg-amber-50":""}><CardHeader className="pb-2"><CardTitle className="text-sm">Low Stock &lt; reorder</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-amber-700">{alerts.low.length}<div className="text-xs font-normal text-zinc-500">reorder needed</div></CardContent></Card>
        <Card className={alerts.out.length? "border-red-300 bg-red-50":""}><CardHeader className="pb-2"><CardTitle className="text-sm">Out of Stock</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-red-700">{alerts.out.length}<div className="text-xs font-normal text-zinc-500">zero stock</div></CardContent></Card>
        <Card className={alerts.nearExpiry.length? "border-amber-300 bg-amber-50":""}><CardHeader className="pb-2"><CardTitle className="text-sm">Near Expiry (14d)</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{alerts.nearExpiry.length}<div className="text-xs font-normal text-zinc-500">expiring soon</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Expired</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-red-600">{alerts.expired.length}<div className="text-xs font-normal text-zinc-500">past expiry</div></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b overflow-x-auto">
        {(["items","transactions","suppliers","purchasing","alerts"] as const).map(t=> <button key={t} onClick={()=> setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${tab===t? "border-zinc-900 text-zinc-900 dark:text-white":"border-transparent text-zinc-500"}`}>{t.toUpperCase()}</button>)}
      </div>

      {tab==="items" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Input placeholder="Search SKU/name" value={q} onChange={e=>setQ(e.target.value)} className="max-w-[240px]" />
            <select value={cat} onChange={e=>setCat(e.target.value)} className="border rounded h-9 px-3 text-sm">{categories.map(c=> <option key={c} value={c}>{c}</option>)}</select>
            <Button size="sm" variant="outline" onClick={loadItems}>Refresh</Button>
            <Button size="sm" onClick={()=> setShowItemForm(v=>!v)}>{showItemForm?"Close":"+ New Item"}</Button>
            <span className="text-xs text-zinc-500 ml-auto">{items.length} shown</span>
          </div>
          {showItemForm && <Card><CardHeader><CardTitle className="text-base">New Inventory Item</CardTitle><CardDescription>SKU auto if empty â€¢ batch/expiry optional â€¢ supplier link</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">
            <div><Label>Name*</Label><Input value={itemForm.name||""} onChange={e=>setItemForm({...itemForm, name:e.target.value})} /></div>
            <div><Label>Category*</Label><select value={itemForm.category as string} onChange={e=>setItemForm({...itemForm, category:e.target.value as InvItem["category"]})} className="w-full border rounded h-9 px-3 text-sm">{categories.filter(c=>c!=="ALL").map(c=> <option key={c} value={c}>{c}</option>)}</select></div>
            <div><Label>Unit*</Label><select value={itemForm.unit as string} onChange={e=>setItemForm({...itemForm, unit:e.target.value as InvItem["unit"]})} className="w-full border rounded h-9 px-3 text-sm">{units.map(u=> <option key={u} value={u}>{u}</option>)}</select></div>
            <div><Label>Current Stock</Label><Input type="number" value={itemForm.currentStock??0} onChange={e=>setItemForm({...itemForm, currentStock:Number(e.target.value)})} /></div>
            <div><Label>Reorder Level</Label><Input type="number" value={itemForm.reorderLevel??10} onChange={e=>setItemForm({...itemForm, reorderLevel:Number(e.target.value)})} /></div>
            <div><Label>Cost / unit ₹</Label><Input type="number" value={itemForm.costPerUnit??0} onChange={e=>setItemForm({...itemForm, costPerUnit:Number(e.target.value)})} /></div>
            <div><Label>SKU (optional)</Label><Input value={itemForm.sku||""} onChange={e=>setItemForm({...itemForm, sku:e.target.value})} placeholder="auto" /></div>
            <div><Label>Supplier</Label><select value={itemForm.supplierId||""} onChange={e=>setItemForm({...itemForm, supplierId:e.target.value})} className="w-full border rounded h-9 px-3 text-sm"><option value="">— None —</option>{suppliers.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><Label>Batch</Label><Input value={itemForm.batchNumber||""} onChange={e=>setItemForm({...itemForm, batchNumber:e.target.value})} /></div>
            <div><Label>Expiry (if applicable)</Label><Input type="date" value={itemForm.expiryDate? (itemForm.expiryDate as string).slice(0,10):""} onChange={e=>setItemForm({...itemForm, expiryDate:e.target.value})} /></div>
            <Button onClick={createItem} className="md:col-span-3">Create Item</Button>
          </CardContent></Card>}
          <div className="rounded border bg-white dark:bg-zinc-900 overflow-auto max-h-[65vh]">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800 text-xs sticky top-0"><tr><th className="p-2 text-left">SKU</th><th className="p-2 text-left">Name</th><th>Category</th><th>Stock</th><th>Reorder</th><th>Cost</th><th>Supplier</th><th>Expiry</th></tr></thead>
              <tbody>
                {items.slice(0,100).map(it=>(
                  <tr key={it.id} className={`border-t ${it.currentStock===0? "bg-red-50": it.currentStock < it.reorderLevel? "bg-amber-50": it.expiryDate && new Date(it.expiryDate).getTime() < Date.now()+14*86400000? "bg-amber-50/60":""}`}>
                    <td className="p-2 font-mono text-xs">{it.sku}</td><td className="p-2">{it.name}<div className="text-xs text-zinc-500">{it.batchNumber||"—"} â€¢ {it.unit}</div></td><td className="p-2 text-xs">{it.category}</td><td className="p-2 text-center"><Badge className={it.currentStock===0? "bg-red-600 text-white": it.currentStock < it.reorderLevel? "bg-amber-500 text-white":""}>{it.currentStock} {it.unit}</Badge></td><td className="p-2 text-center">{it.reorderLevel}</td><td className="p-2">₹{it.costPerUnit}</td><td className="p-2 text-xs">{it.supplier?.name || "—"}</td><td className="p-2 text-xs">{it.expiryDate? new Date(it.expiryDate).toLocaleDateString(): "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==="transactions" && (
        <div className="space-y-3">
          <div className="flex gap-2"><Button size="sm" onClick={()=> setShowTxForm(v=>!v)}>{showTxForm?"Close":"+ New Transaction"}</Button><Button size="sm" variant="outline" onClick={loadTx}>Refresh</Button><span className="text-xs text-zinc-500 self-center">Purchase positive, Consumption/Waste negative — stock auto-adjusted</span></div>
          {showTxForm && <Card><CardHeader><CardTitle className="text-base">Stock Transaction</CardTitle><CardDescription>Types: Purchase / Consumption / Adjustment / Waste / Return / Transfer</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Item*</Label><select value={txForm.inventoryItemId} onChange={e=>setTxForm({...txForm, inventoryItemId:e.target.value})} className="w-full border rounded h-9 px-3 text-sm"><option value="">Select item</option>{items.slice(0,100).map(i=> <option key={i.id} value={i.id}>{i.sku} — {i.name} ({i.currentStock}{i.unit})</option>)}</select></div>
            <div><Label>Type*</Label><select value={txForm.type} onChange={e=>setTxForm({...txForm, type:e.target.value as Tx["type"]})} className="w-full border rounded h-9 px-3 text-sm"><option>PURCHASE</option><option>CONSUMPTION</option><option>ADJUSTMENT</option><option>WASTE</option><option>RETURN</option><option>TRANSFER</option></select></div>
            <div><Label>Quantity* (+)in (-)out</Label><Input type="number" value={txForm.quantity} onChange={e=>setTxForm({...txForm, quantity:Number(e.target.value)})} /></div>
            <div className="md:col-span-4"><Label>Reference</Label><Input value={txForm.reference} onChange={e=>setTxForm({...txForm, reference:e.target.value})} placeholder="PO-123, wastage reason, etc" /></div>
            <Button onClick={createTx} className="md:col-span-4">Record Transaction</Button>
          </CardContent></Card>}
          <div className="rounded border bg-white dark:bg-zinc-900 overflow-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800 text-xs sticky top-0"><tr><th className="p-2 text-left">Item</th><th>Type</th><th>Qty</th><th>Reference</th><th>Date</th></tr></thead>
              <tbody>
                {txs.slice(0,100).map(t=>(
                  <tr key={t.id} className="border-t"><td className="p-2 text-xs">{t.inventoryItem?.name || t.inventoryItemId}<div className="text-zinc-500">{t.inventoryItem?.sku||""}</div></td><td className="p-2"><Badge className={t.type==="PURCHASE"?"bg-green-100 text-green-800": t.type==="CONSUMPTION"?"bg-blue-100 text-blue-800": t.type==="WASTE"?"bg-red-100 text-red-800":"bg-zinc-100"}>{t.type}</Badge></td><td className={`p-2 font-bold ${t.quantity>0?"text-green-600":"text-red-600"}`}>{t.quantity>0?`+${t.quantity}`:t.quantity}</td><td className="p-2 text-xs">{t.reference||"—"}</td><td className="p-2 text-xs">{new Date(t.createdAt).toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==="suppliers" && (
        <div className="space-y-3">
          <Button size="sm" onClick={()=> setShowSupForm(v=>!v)}>{showSupForm?"Close":"+ New Supplier"}</Button>
          {showSupForm && <Card><CardContent className="grid gap-3 md:grid-cols-2 p-4">
            <div><Label>Name*</Label><Input value={supForm.name} onChange={e=>setSupForm({...supForm, name:e.target.value})} /></div>
            <div><Label>Contact</Label><Input value={supForm.contactName} onChange={e=>setSupForm({...supForm, contactName:e.target.value})} /></div>
            <div><Label>Phone</Label><Input value={supForm.phone} onChange={e=>setSupForm({...supForm, phone:e.target.value})} /></div>
            <div><Label>Email</Label><Input value={supForm.email} onChange={e=>setSupForm({...supForm, email:e.target.value})} /></div>
            <Button onClick={createSupplier} className="md:col-span-2">Create Supplier</Button>
          </CardContent></Card>}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.map(s=>(
              <Card key={s.id}><CardHeader className="pb-2"><CardTitle className="text-base">{s.name}</CardTitle><CardDescription>{s.contactName||"—"} â€¢ {s.phone||"—"} â€¢ {s.email||"—"}</CardDescription></CardHeader><CardContent className="text-xs text-zinc-500">{s.address||"—"} â€¢ GST {s.gstin||"—"}</CardContent></Card>
            ))}
          </div>
        </div>
      )}

      {tab==="purchasing" && (
        <div className="space-y-3">
          <Button size="sm" onClick={()=> setShowPOForm(v=>!v)}>{showPOForm?"Close":"+ New Purchase Order"}</Button>
          {showPOForm && <Card><CardHeader><CardTitle className="text-base">New Purchase Order</CardTitle></CardHeader><CardContent className="space-y-3">
            <div><Label>Supplier*</Label><select value={poForm.supplierId} onChange={e=>setPoForm({...poForm, supplierId:e.target.value})} className="w-full border rounded h-9 px-3 text-sm"><option value="">Select</option>{suppliers.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            {poForm.items.map((it,idx)=>(
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1"><Label>Item</Label><select value={it.inventoryItemId} onChange={e=> setPoForm(p=> ({...p, items: p.items.map((x,i)=> i===idx? {...x, inventoryItemId:e.target.value}:x)}))} className="w-full border rounded h-9 px-3 text-sm"><option value="">Select</option>{items.slice(0,50).map(i=> <option key={i.id} value={i.id}>{i.sku} {i.name}</option>)}</select></div>
                <div><Label>Qty</Label><Input type="number" value={it.quantity} onChange={e=> setPoForm(p=> ({...p, items: p.items.map((x,i)=> i===idx? {...x, quantity:Number(e.target.value)}:x)}))} className="w-20" /></div>
                <div><Label>Unit Cost</Label><Input type="number" value={it.unitCost} onChange={e=> setPoForm(p=> ({...p, items: p.items.map((x,i)=> i===idx? {...x, unitCost:Number(e.target.value)}:x)}))} className="w-24" /></div>
                {poForm.items.length>1 && <Button variant="ghost" onClick={()=> setPoForm(p=> ({...p, items: p.items.filter((_,i)=> i!==idx)}))}>âœ•</Button>}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={()=> setPoForm(p=> ({...p, items:[...p.items, { inventoryItemId:"", quantity:10, unitCost:100 }]}))}>+ Line</Button>
            <div><Label>Notes</Label><Input value={poForm.notes} onChange={e=>setPoForm({...poForm, notes:e.target.value})} /></div>
            <Button onClick={createPO}>Create PO (DRAFT)</Button>
          </CardContent></Card>}
          <div className="rounded border bg-white dark:bg-zinc-900 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800 text-xs"><tr><th className="p-2 text-left">PO</th><th>Supplier</th><th>Status</th><th>Total</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {pos.map(p=>(
                  <tr key={p.id} className="border-t"><td className="p-2 font-mono text-xs">{p.poNumber}</td><td className="p-2 text-xs">{p.supplier?.name || p.supplierId}</td><td className="p-2"><Badge className={p.status==="RECEIVED"?"bg-green-600 text-white": p.status==="ORDERED"?"bg-blue-100 text-blue-800": "bg-zinc-100"}>{p.status}</Badge></td><td className="p-2">₹{p.totalAmount}</td><td className="p-2 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="p-2 flex gap-1">{p.status==="DRAFT" && <Button size="sm" variant="outline" className="h-6 text-xs" onClick={()=> advancePO(p.id,"ORDERED")}>Order</Button>}{p.status==="ORDERED" && <Button size="sm" className="h-6 text-xs" onClick={()=> advancePO(p.id,"RECEIVED")}>Receive (stock in)</Button>}{p.status==="RECEIVED" && <Button size="sm" variant="outline" className="h-6 text-xs" onClick={()=> advancePO(p.id,"INVOICED")}>Invoice</Button>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <Card><CardContent className="p-3 text-xs text-zinc-500">Flow: DRAFT â†’ ORDERED â†’ RECEIVED (goods received â†’ Purchase stock +) â†’ INVOICED. Supplier invoices & payment status tracked via PO status + audit.</CardContent></Card>
        </div>
      )}

      {tab==="alerts" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-base">Low Stock ({alerts.low.length})</CardTitle></CardHeader><CardContent className="space-y-1 text-sm max-h-80 overflow-auto">{alerts.low.slice(0,30).map(i=> <div key={i.id} className="flex justify-between border-b py-1"><span>{i.sku} {i.name}</span><span className="text-amber-600">{i.currentStock}/{i.reorderLevel} {i.unit}</span></div>) || "—"}</CardContent></Card>
          <Card className="border-red-200"><CardHeader><CardTitle className="text-base">Out of Stock ({alerts.out.length})</CardTitle></CardHeader><CardContent className="space-y-1 text-sm max-h-80 overflow-auto">{alerts.out.slice(0,30).map(i=> <div key={i.id} className="flex justify-between border-b py-1"><span>{i.sku} {i.name}</span><span className="text-red-600">0 {i.unit}</span></div>) || "—"}</CardContent></Card>
          <Card className="border-amber-200"><CardHeader><CardTitle className="text-base">Near Expiry 14d ({alerts.nearExpiry.length})</CardTitle></CardHeader><CardContent className="space-y-1 text-sm max-h-80 overflow-auto">{alerts.nearExpiry.slice(0,30).map(i=> <div key={i.id} className="flex justify-between border-b py-1"><span>{i.sku} {i.name}</span><span>{i.expiryDate? new Date(i.expiryDate).toLocaleDateString():"—"}</span></div>) || "—"}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Inventory Service</CardTitle></CardHeader><CardContent className="text-xs text-zinc-500">Service at <code>src/lib/inventory-service.ts:1</code> separate from POS. Future: RecipeItem consumption auto via <code>consumeForOrder()</code>. Current stock is source of truth, transactions append-only.</CardContent></Card>
        </div>
      )}
    </div>
  );
}

