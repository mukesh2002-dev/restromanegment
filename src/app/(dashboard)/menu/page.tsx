"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demoCategories, demoMenuItems } from "@/data/demo";
import { UNIT_OPTIONS, UNIT_LABEL, UNIT_HINT } from "@/lib/menu-helpers";

type Category = { id:string; name:string; slug:string; sortOrder:number; isActive?:boolean; _count?:{items:number} };
type MenuItem = {
  id:string; name:string; description?:string|null; price:number; taxPercent:number;
  isVeg:boolean; isAvailable:boolean; imageUrl?:string|null; servingUnit?:string|null;
  sku?:string|null; prepTimeMin?:number|null; categoryId:string;
  category?:{name:string; slug?:string}; variants?:{id:string;name:string;priceDelta:number}[]; addOns?:{id:string;name:string;price:number}[]
};



function unitBadgeClass(unit?:string|null){
  switch(unit){
    case "PCS": return "bg-amber-100 text-amber-800 border-amber-200";
    case "PLATE": return "bg-sky-100 text-sky-800 border-sky-200";
    case "BOWL": return "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200";
    case "GLASS": return "bg-cyan-100 text-cyan-800 border-cyan-200";
    case "THALI": return "bg-orange-100 text-orange-800 border-orange-200";
    default: return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
}

export default function MenuPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [filterCat, setFilterCat] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState<Partial<MenuItem> & {price?:number; categoryId?:string, servingUnit?:string}>({ price: 199, categoryId: "" , name:"", isVeg:true, isAvailable:true, taxPercent:5, servingUnit:"PLATE", imageUrl:"" });
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [cRes, iRes] = await Promise.all([
        fetch("/api/categories", { cache: 'no-store' }).then(r=>r.json()).catch(()=> demoCategories),
        fetch(`/api/menu-items${filterCat?`?categoryId=${filterCat}`: search?`?search=${encodeURIComponent(search)}`:""}`).then(r=>r.json()).catch(()=> demoMenuItems),
      ]);
      // POS parity: fallback to demo when DB empty or stale JWT (avoids empty menu while POS shows demo)
      const catsList = Array.isArray(cRes) && cRes.length ? cRes : demoCategories;
      const rawList = Array.isArray(iRes) && iRes.length ? iRes : demoMenuItems;
      setCats(catsList);
      let filtered = rawList as MenuItem[];
      if (search && !filterCat) filtered = rawList.filter((m:MenuItem)=> m.name.toLowerCase().includes(search.toLowerCase()));
      if (filterCat) filtered = rawList.filter((m:MenuItem)=> m.categoryId===filterCat);
      setItems(filtered);
      if (!rawList.length) setMsg("DB empty or session stale — showing demo data. Re-login as OWNER to create.");
    } catch { setCats(demoCategories as Category[]); setItems(demoMenuItems as unknown as MenuItem[]); }
    setLoading(false);
  }
  useEffect(()=>{ load(); }, [filterCat]);
  useEffect(()=>{ const t=setTimeout(()=>{ if(search) load(); else if(!filterCat) load(); }, 350); return ()=>clearTimeout(t); }, [search]);

  async function createCategory() {
    if(!catName.trim()) return;
    const res = await fetch("/api/categories",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ name: catName })});
    if(res.ok){ setCatName(""); setShowCatForm(false); setMsg("âœ“ Category created"); load(); } else { const j=await res.json(); setMsg(j.error||"Failed"); }
  }

  async function toggleItemAvailable(item: MenuItem) {
    setBusyId(item.id);
    const res = await fetch(`/api/menu-items/${item.id}`,{ method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ isAvailable: !item.isAvailable })});
    setBusyId(null);
    if(res.ok){ const updated = await res.json().catch(()=>null); setItems(prev=> prev.map(p=> p.id===item.id? { ...p, isAvailable: updated?.isAvailable ?? !p.isAvailable}:p)); }
    else setItems(prev=> prev.map(p=> p.id===item.id? {...p, isAvailable: !p.isAvailable}:p));
  }

  function openCreate(){
    setEditingItem(null);
    setItemForm({ price: 199, categoryId: cats[0]?.id || "", name:"", isVeg:true, isAvailable:true, taxPercent:5, servingUnit:"PLATE", imageUrl:"", description:"", sku:"", prepTimeMin:15 });
    setShowItemForm(true);
  }
  function openEdit(item: MenuItem){
    setEditingItem(item);
    setItemForm({ ...item, price: item.price, categoryId: item.categoryId, servingUnit: item.servingUnit || "PLATE" });
    setShowItemForm(true);
  }

  async function saveItem() {
    if(!itemForm.name || !itemForm.categoryId || itemForm.price===undefined) { setMsg("Name, category and price required"); return; }
    const payload = {
      categoryId: itemForm.categoryId, name: itemForm.name, price: Number(itemForm.price),
      taxPercent: Number(itemForm.taxPercent||5), isVeg: !!itemForm.isVeg, isAvailable: itemForm.isAvailable!==false,
      description: itemForm.description || undefined, imageUrl: itemForm.imageUrl || undefined,
      servingUnit: itemForm.servingUnit || "PLATE", sku: (itemForm as unknown as {sku:string}).sku || undefined,
      prepTimeMin: Number((itemForm as unknown as {prepTimeMin:number}).prepTimeMin || 15),
    };
    if(editingItem){
      const res = await fetch(`/api/menu-items/${editingItem.id}`,{ method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(payload)});
      if(res.ok){ const updated = await res.json(); setItems(prev=> prev.map(p=> p.id===editingItem.id? {...p, ...updated}:p)); setShowItemForm(false); setEditingItem(null); setMsg(`âœ“ ${payload.name} updated`); }
      else { const j=await res.json(); setMsg(j.error||"Update failed"); }
    } else {
      const res = await fetch("/api/menu-items",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(payload)});
      if(res.ok){ setShowItemForm(false); setMsg(`âœ“ ${payload.name} created`); load(); } else { const j=await res.json(); setMsg(j.error||"Failed"); }
    }
  }

  async function deleteItem(item: MenuItem){
    if(!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setBusyId(item.id);
    const res = await fetch(`/api/menu-items/${item.id}`,{ method:"DELETE" });
    setBusyId(null);
    if(res.ok){ setItems(prev=> prev.filter(p=> p.id!==item.id)); setMsg(`âœ“ ${item.name} deleted`); }
    else setMsg("Delete failed (maybe demo item)");
  }

  return (
    <div className="space-y-6">
      {/* Header - Petpooja/Toast inspired */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-sm text-zinc-500">Petpooja • Toast inspired — images, units & inline editing. Roti/Naan = PCS, Sabzi/Thali = Plate</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={()=> setShowCatForm(v=>!v)}>+ Category</Button>
          <Button onClick={openCreate} className="bg-orange-600 hover:bg-orange-700">+ Menu Item</Button>
        </div>
      </div>
      {msg && <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 flex justify-between items-center"><span>{msg}</span><button onClick={()=>setMsg("")} className="text-zinc-500 hover:text-zinc-700">âœ•</button></div>}

      {showCatForm && <Card className="border-orange-200"><CardHeader><CardTitle className="text-base">New Category</CardTitle><CardDescription>Slug auto-generated — e.g. Biryani & Rice â†’ biryani-rice</CardDescription></CardHeader><CardContent className="flex gap-2"><Input placeholder="Category name e.g. Desserts" value={catName} onChange={e=>setCatName(e.target.value)} className="flex-1" /><Button onClick={createCategory} className="bg-zinc-900">Create</Button><Button variant="ghost" onClick={()=>setShowCatForm(false)}>Cancel</Button></CardContent></Card>}

      {showItemForm && (
        <Card className="border-zinc-200 shadow-lg">
          <CardHeader><CardTitle className="text-base">{editingItem ? `Edit — ${editingItem.name}` : "New Menu Item"}</CardTitle><CardDescription>Image, unit (PCS/Plate), veg, price & availability — Zomato/Petpooja standard</CardDescription></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label>Name*</Label><Input value={itemForm.name||""} onChange={e=>setItemForm({...itemForm, name:e.target.value})} placeholder="e.g. Tandoori Roti" /></div>
            <div><Label>Category*</Label><select value={itemForm.categoryId||""} onChange={e=>setItemForm({...itemForm, categoryId:e.target.value})} className="w-full border rounded-md h-9 px-3 text-sm bg-white dark:bg-zinc-900"><option value="">Select</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><Label>Price* (₹)</Label><Input type="number" value={itemForm.price??""} onChange={e=>setItemForm({...itemForm, price: Number(e.target.value)})} /></div>
            <div><Label>Serving Unit* <span className="font-normal text-xs text-zinc-500">Roti=PCS, Sabzi=Plate</span></Label>
              <select value={itemForm.servingUnit||"PLATE"} onChange={e=>setItemForm({...itemForm, servingUnit:e.target.value})} className="w-full border rounded-md h-9 px-3 text-sm bg-white dark:bg-zinc-900">
                {UNIT_OPTIONS.map(u=> <option key={u} value={u}>{UNIT_LABEL[u]} — {UNIT_HINT[u]}</option>)}
              </select>
            </div>
            <div><Label>Tax %</Label><Input type="number" value={itemForm.taxPercent??5} onChange={e=>setItemForm({...itemForm, taxPercent: Number(e.target.value)})} /></div>
            <div><Label>Prep Time (min)</Label><Input type="number" value={(itemForm.prepTimeMin as number) ?? 15} onChange={e=>setItemForm({...itemForm, prepTimeMin: Number(e.target.value)})} /></div>
            <div><Label>SKU (optional)</Label><Input value={itemForm.sku || ""} onChange={e=>setItemForm({...itemForm, sku:e.target.value})} placeholder="e.g. BRD-ROTI-01" /></div>
            <div className="md:col-span-2"><Label>Description</Label><Input value={itemForm.description||""} onChange={e=>setItemForm({...itemForm, description:e.target.value})} placeholder="Authentic tandoor roasted" /></div>
            <div className="md:col-span-2">
              <Label>Image URL</Label>
              <div className="flex gap-2">
                <Input value={itemForm.imageUrl||""} onChange={e=>setItemForm({...itemForm, imageUrl:e.target.value})} placeholder="https://images.unsplash.com/..." className="flex-1" />
                {itemForm.imageUrl && <img src={itemForm.imageUrl} alt="preview" className="h-9 w-14 object-cover rounded border" onError={(e)=> (e.currentTarget.style.display='none')} />}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Use Unsplash/CDN link — 600Ã—400 recommended. Leave empty for fallback.</p>
            </div>
            <div className="flex items-center gap-6 py-1">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!itemForm.isVeg} onChange={e=>setItemForm({...itemForm, isVeg:e.target.checked})} className="rounded" /> <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm border-2 border-green-600 flex items-center justify-center"><span className="h-1.5 w-1.5 rounded-full bg-green-600 inline-block"/></span> Veg</span></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={itemForm.isAvailable!==false} onChange={e=>setItemForm({...itemForm, isAvailable:e.target.checked})} className="rounded" /> Available</label>
            </div>
            <div className="md:col-span-2 flex gap-2 pt-2">
              <Button onClick={saveItem} className="bg-orange-600 hover:bg-orange-700 min-w-[120px]">{editingItem ? "Save changes" : "Create item"}</Button>
              <Button variant="outline" onClick={()=> { setShowItemForm(false); setEditingItem(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category chips + search - reference: Petpooja quick filters */}
      <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-zinc-900 p-2 rounded-xl border">
        <Button variant={filterCat===""?"default":"outline"} size="sm" onClick={()=> setFilterCat("")} className={filterCat===""?"bg-zinc-900":""}>All <span className="ml-1 opacity-70">({items.length})</span></Button>
        {cats.map(c=> <Button key={c.id} variant={filterCat===c.id?"default":"outline"} size="sm" onClick={()=> setFilterCat(c.id)} className={filterCat===c.id?"bg-orange-600 hover:bg-orange-700":""}>{c.name} {c._count?`(${c._count.items})`:""}</Button>)}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-zinc-500 hidden md:inline">Optimized • 80 items • Petpooja style</span>
          <Input placeholder="Search Paneer, Biryani, Roti..." value={search} onChange={e=>setSearch(e.target.value)} className="max-w-[220px] h-8" />
        </div>
      </div>

      {/* Category overview — shows live count, not demo */}
      <div className="grid gap-3 md:grid-cols-4">
        {cats.slice(0,8).map(c=>(
          <Card key={c.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{c.name}</CardTitle><CardDescription className="text-[11px] break-all">/{c.slug} • order {c.sortOrder}</CardDescription></CardHeader>
            <CardContent className="text-xs text-zinc-500">{items.filter(m=>m.categoryId===c.id).length || c._count?.items || 0} items • {c.isActive===false?"Inactive":"Active"}</CardContent>
          </Card>
        ))}
      </div>

      {loading? (
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">{Array.from({length:8}).map((_,i)=><Card key={i} className="animate-pulse"><div className="h-36 bg-zinc-100 dark:bg-zinc-800"/><div className="p-4 space-y-2"><div className="h-4 bg-zinc-100 rounded"/><div className="h-3 bg-zinc-100 rounded w-2/3"/></div></Card>)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.slice(0,100).map(m=>(
            <Card key={m.id} className={`group overflow-hidden hover:shadow-lg transition-all border-zinc-200 ${!m.isAvailable ? "opacity-60 border-dashed bg-zinc-50" : "bg-white"} `}>
              <div className="relative">
                {m.imageUrl ? (
                  <img src={m.imageUrl} alt={m.name} className="h-36 w-full object-cover group-hover:scale-[1.02] transition-transform duration-300" loading="lazy" onError={(e)=>{ (e.target as HTMLImageElement).src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80&auto=format&fit=crop"; }} />
                ) : (
                  <div className="h-36 w-full bg-gradient-to-br from-orange-50 to-amber-100 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-xs text-zinc-400">No image — editable</div>
                )}
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  <span className={`h-5 w-5 rounded bg-white border flex items-center justify-center ${m.isVeg?"border-green-600":"border-red-600"}`} title={m.isVeg?"Veg":"Non-Veg"}><span className={`h-2 w-2 rounded-full ${m.isVeg?"bg-green-600":"bg-red-600"}`}/></span>
                  <span className={`text-[10px] px-2 py-1 rounded-full border font-medium ${unitBadgeClass(m.servingUnit)}`}>{UNIT_LABEL[m.servingUnit || "PLATE"]}</span>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={()=> openEdit(m)} className="h-7 w-7 rounded-full bg-white shadow border flex items-center justify-center hover:bg-zinc-50 text-xs" title="Edit">âœŽ</button>
                  <button onClick={()=> deleteItem(m)} className="h-7 w-7 rounded-full bg-white shadow border flex items-center justify-center hover:bg-red-50 text-xs text-red-600" title="Delete">🍽—‘</button>
                </div>
                {!m.isAvailable && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><span className="text-xs font-bold tracking-widest text-zinc-700 border border-zinc-400 px-3 py-1 rounded bg-white">OUT OF STOCK</span></div>}
              </div>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-1" title={m.name}>{m.name}</h3>
                  <span className="text-[10px] text-zinc-400 shrink-0">{m.category?.name || cats.find(c=>c.id===m.categoryId)?.name || ""}</span>
                </div>
                <div className="text-xs text-zinc-500 line-clamp-2 min-h-[32px]">{m.description || "Authentic spices, chef special"}</div>
                <div className="flex items-end justify-between pt-1 border-t">
                  <div>
                    <div className="font-bold text-sm">₹{m.price} <span className="font-normal text-xs text-zinc-500">/ {UNIT_LABEL[m.servingUnit || "PLATE"]}</span></div>
                    <div className="text-[11px] text-zinc-400">+{m.taxPercent}% tax • {m.prepTimeMin||15} min • {m.sku || "no SKU"}</div>
                  </div>
                  <button
                    onClick={()=> toggleItemAvailable(m)}
                    disabled={busyId===m.id}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${m.isAvailable?"bg-green-600 text-white border-green-600 hover:bg-green-700":"bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800"} disabled:opacity-50`}
                  >
                    {busyId===m.id ? "..." : m.isAvailable? "Available" : "Mark available"}
                  </button>
                </div>
                {Boolean(m.variants?.length) && <div className="text-[11px] text-zinc-500 truncate">Variants: {m.variants!.map(v=> `${v.name} (+₹${v.priceDelta})`).join(" • ")}</div>}
                {Boolean(m.addOns?.length) && <div className="text-[11px] text-zinc-500 truncate">Add-ons: {m.addOns!.map(a=> `${a.name} (+₹${a.price})`).join(" • ")}</div>}
                <div className="flex gap-2 pt-1">
                  <button onClick={()=> openEdit(m)} className="flex-1 text-xs py-1.5 rounded border hover:bg-zinc-50 font-medium">Edit</button>
                  <button onClick={()=> deleteItem(m)} className="text-xs px-3 py-1.5 rounded border hover:bg-red-50 text-red-600 font-medium">Delete</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="text-xs text-zinc-500 flex flex-wrap gap-2 items-center justify-between">
        <span>Showing {items.length} items — <b>PCS</b> for Roti/Naan/Paratha/Kulcha/Dosa/Samosa, <b>Plate</b> for Sabzi/Dal/Biryani/Noodles, <b>Bowl</b> for Sweets, <b>Glass</b> for Beverages. Reference: Petpooja / Toast POS.</span>
        <span className="text-[11px] bg-zinc-900 text-white px-2 py-1 rounded">Optimized • Lazy images • Edit-in-place</span>
      </div>
    </div>
  );
}

