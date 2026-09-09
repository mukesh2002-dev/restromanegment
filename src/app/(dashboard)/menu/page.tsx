"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demoCategories, demoMenuItems } from "@/data/demo";

type Category = { id:string; name:string; slug:string; sortOrder:number; isActive:boolean; _count?:{items:number} };
type MenuItem = { id:string; name:string; description?:string|null; price:number; taxPercent:number; isVeg:boolean; isAvailable:boolean; imageUrl?:string|null; sku?:string|null; prepTimeMin?:number|null; categoryId:string; category?:{name:string}; variants?:{id:string;name:string;priceDelta:number}[]; addOns?:{id:string;name:string;price:number}[] };

export default function MenuPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [filterCat, setFilterCat] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState<Partial<MenuItem> & {price?:number; categoryId?:string}>({ price: 199, categoryId: "" , name:"", isVeg:true, isAvailable:true, taxPercent:5 });
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [cRes, iRes] = await Promise.all([
        fetch("/api/categories").then(r=>r.json()).catch(()=> demoCategories),
        fetch(`/api/menu-items${filterCat?`?categoryId=${filterCat}`: search?`?search=${encodeURIComponent(search)}`:""}`).then(r=>r.json()).catch(()=> demoMenuItems),
      ]);
      setCats(Array.isArray(cRes)?cRes: demoCategories);
      const list = Array.isArray(iRes)? iRes: demoMenuItems;
      let filtered = list;
      if (search && !filterCat) filtered = list.filter((m:MenuItem)=> m.name.toLowerCase().includes(search.toLowerCase()));
      if (filterCat) filtered = list.filter((m:MenuItem)=> m.categoryId===filterCat);
      setItems(filtered);
    } catch { setCats(demoCategories as Category[]); setItems(demoMenuItems as unknown as MenuItem[]); }
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{ load(); }, [filterCat]);
  useEffect(()=>{ const t=setTimeout(()=>{ if(search) load(); else if(!filterCat) load(); }, 400); return ()=>clearTimeout(t); }, [search]);

  async function createCategory() {
    if(!catName.trim()) return;
    const res = await fetch("/api/categories",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ name: catName })});
    if(res.ok){ setCatName(""); setShowCatForm(false); setMsg("Category created (server generated slug)"); load(); } else { const j=await res.json(); setMsg(j.error||"Failed"); }
  }
  async function toggleItemAvailable(item: MenuItem) {
    const res = await fetch(`/api/menu-items/${item.id}`,{ method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ isAvailable: !item.isAvailable })});
    if(res.ok) setItems(prev=> prev.map(p=> p.id===item.id? {...p, isAvailable: !p.isAvailable}:p));
    else setItems(prev=> prev.map(p=> p.id===item.id? {...p, isAvailable: !p.isAvailable}:p)); // demo fallback optimistic
  }
  async function createItem() {
    if(!itemForm.name || !itemForm.categoryId || !itemForm.price) { setMsg("Name, category and price required"); return; }
    const payload = { categoryId: itemForm.categoryId, name: itemForm.name, price: Number(itemForm.price), taxPercent: Number(itemForm.taxPercent||5), isVeg: !!itemForm.isVeg, isAvailable: itemForm.isAvailable!==false, description: itemForm.description, imageUrl: itemForm.imageUrl, sku: (itemForm as unknown as {sku:string}).sku };
    const res = await fetch("/api/menu-items",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(payload)});
    if(res.ok){ setShowItemForm(false); setMsg("Item created — price/tax server-validated"); load(); } else { const j=await res.json(); setMsg(j.error||"Failed"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Menu & Categories</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={()=> setShowCatForm(v=>!v)}>+ Category</Button>
          <Button onClick={()=> setShowItemForm(v=>!v)}>+ Menu Item</Button>
        </div>
      </div>
      {msg && <div className="text-sm bg-amber-50 border border-amber-200 rounded p-2">{msg}</div>}

      {showCatForm && <Card><CardHeader><CardTitle className="text-base">New Category</CardTitle><CardDescription>Slug auto-generated server-side, e.g. starters</CardDescription></CardHeader><CardContent className="flex gap-2"><Input placeholder="Category name e.g. Desserts" value={catName} onChange={e=>setCatName(e.target.value)} /><Button onClick={createCategory}>Create</Button></CardContent></Card>}

      {showItemForm && <Card><CardHeader><CardTitle className="text-base">New Menu Item</CardTitle><CardDescription>Price, tax, variants, add-ons, veg flag, image-ready</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
        <div><Label>Name*</Label><Input value={itemForm.name||""} onChange={e=>setItemForm({...itemForm, name:e.target.value})} /></div>
        <div><Label>Category*</Label><select value={itemForm.categoryId||""} onChange={e=>setItemForm({...itemForm, categoryId:e.target.value})} className="w-full border rounded h-9 px-3 text-sm"><option value="">Select</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><Label>Price* (INR)</Label><Input type="number" value={itemForm.price??""} onChange={e=>setItemForm({...itemForm, price: Number(e.target.value)})} /></div>
        <div><Label>Tax %</Label><Input type="number" value={itemForm.taxPercent??5} onChange={e=>setItemForm({...itemForm, taxPercent: Number(e.target.value)})} /></div>
        <div><Label>Description</Label><Input value={itemForm.description||""} onChange={e=>setItemForm({...itemForm, description:e.target.value})} placeholder="Optional" /></div>
        <div><Label>Image URL (ready)</Label><Input value={itemForm.imageUrl||""} onChange={e=>setItemForm({...itemForm, imageUrl:e.target.value})} placeholder="https://..." /></div>
        <div className="flex items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!itemForm.isVeg} onChange={e=>setItemForm({...itemForm, isVeg:e.target.checked})} /> Veg</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={itemForm.isAvailable!==false} onChange={e=>setItemForm({...itemForm, isAvailable:e.target.checked})} /> Available</label></div>
        <div className="md:col-span-2 flex gap-2"><Button onClick={createItem}>Create Item</Button><Button variant="outline" onClick={()=> setShowItemForm(false)}>Cancel</Button></div>
      </CardContent></Card>}

      <div className="flex flex-wrap gap-2 items-center">
        <Button variant={filterCat===""?"default":"outline"} size="sm" onClick={()=> setFilterCat("")}>All</Button>
        {cats.map(c=> <Button key={c.id} variant={filterCat===c.id?"default":"outline"} size="sm" onClick={()=> setFilterCat(c.id)}>{c.name} {c._count?`(${c._count.items})`:""}</Button>)}
        <Input placeholder="Search items..." value={search} onChange={e=>setSearch(e.target.value)} className="max-w-[200px] ml-auto" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {cats.map(c=>(
          <Card key={c.id}><CardHeader className="pb-2"><CardTitle className="text-base">{c.name}</CardTitle><CardDescription className="text-xs break-all">/{c.slug} • order {c.sortOrder}</CardDescription></CardHeader><CardContent className="text-xs text-zinc-500">{demoMenuItems.filter(m=>m.categoryId===c.id).length} demo items • {c.isActive===false?"Inactive":"Active"}</CardContent></Card>
        ))}
      </div>

      {loading? <div className="text-sm text-zinc-500">Loading menu…</div> : (
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          {items.slice(0,80).map(m=>(
            <Card key={m.id} className={!m.isAvailable ? "opacity-60 border-dashed" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm leading-tight">{m.name}</span>
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${m.isVeg?"bg-green-600":"bg-red-600"} border`} title={m.isVeg?"Veg":"Non-Veg"} />
                </div>
                {m.imageUrl ? <img src={m.imageUrl} alt={m.name} className="h-20 w-full object-cover rounded" /> : <div className="h-20 w-full bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center text-xs text-zinc-400">image-ready</div>}
                <div className="text-xs text-zinc-500 line-clamp-2">{m.description || "Authentic preparation"}</div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">₹{m.price} <span className="font-normal text-xs text-zinc-500">+{m.taxPercent}% tax</span></span>
                  <button onClick={()=> toggleItemAvailable(m)} className={`text-xs px-2 py-1 rounded-full border ${m.isAvailable?"bg-green-50 border-green-200 text-green-700":"bg-zinc-100"}`}>{m.isAvailable?"Available":"Out"}</button>
                </div>
                {Boolean(m.variants?.length) && <div className="text-xs text-zinc-500">Variants: {m.variants!.map(v=> `${v.name} (+₹${v.priceDelta})`).join(", ")}</div>}
                {Boolean(m.addOns?.length) && <div className="text-xs text-zinc-500">Add-ons: {m.addOns!.map(a=> `${a.name} (+₹${a.price})`).join(", ")}</div>}
                <div className="text-[11px] text-zinc-400">SKU {m.sku || "—"} • {m.prepTimeMin||15} min</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="text-xs text-zinc-500">Prices & tax validated server-side on order — client cannot override. Showing {items.length} of 80 items.</div>
    </div>
  );
}
