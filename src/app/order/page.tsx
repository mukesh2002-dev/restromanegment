"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { demoMenuItems, demoCategories } from "@/data/demo";
import Link from "next/link";

type MenuItem = { id:string; name:string; description?:string; price:number; isVeg:boolean; isAvailable:boolean; categoryId:string; variants?:{id:string;name:string;priceDelta:number}[]; addOns?:{id:string;name:string;price:number}[] };
type Category = { id:string; name:string; slug:string };
type CartItem = { key:string; menuItemId:string; name:string; quantity:number; unitPrice:number; notes?:string; variantId?:string; addOnIds?:string[] };

export default function OnlineOrderPage(){
  const [categories,setCategories]=useState<Category[]>(demoCategories as unknown as Category[]);
  const [menu,setMenu]=useState<MenuItem[]>(demoMenuItems as unknown as MenuItem[]);
  const [filterCat,setFilterCat]=useState<string>("ALL");
  const [search,setSearch]=useState("");
  const [cart,setCart]=useState<CartItem[]>([]);
  const [orderType,setOrderType]=useState<"DINE_IN"|"TAKEAWAY"|"DELIVERY">("DELIVERY");
  const [customer,setCustomer]=useState({ name:"", phone:"", email:"" });
  const [address,setAddress]=useState({ address:"", area:"", instructions:"" });
  const [coupon,setCoupon]=useState("");
  const [discount,setDiscount]=useState(0);
  const [couponMsg,setCouponMsg]=useState("");
  const [placing,setPlacing]=useState(false);
  const [result,setResult]=useState<{orderNumber:string; id:string; totalAmount:number}|null>(null);
  const [paymentMethod,setPaymentMethod]=useState<"CASH"|"CARD"|"UPI"|"ONLINE">("CASH");

  useEffect(()=>{
    fetch("/api/categories").then(r=>r.json()).then(j=> Array.isArray(j)&&j.length? setCategories(j):null).catch(()=>null);
    fetch("/api/menu-items?take=100").then(r=>r.json()).then(j=> Array.isArray(j)&&j.length? setMenu(j as MenuItem[]):null).catch(()=>null);
  },[]);

  function add(item:MenuItem, variantId?:string, addOnIds?:string[]){
    const variant=item.variants?.find(v=> v.id===variantId);
    const addOns=item.addOns?.filter(a=> addOnIds?.includes(a.id))||[];
    const addOnPrice=addOns.reduce((a,b)=>a+b.price,0);
    const unit=item.price + (variant?.priceDelta||0) + addOnPrice;
    const key=`${item.id}::${variantId||""}::${(addOnIds||[]).join(",")}`;
    setCart(prev=>{
      const f=prev.find(p=> p.key===key);
      if(f) return prev.map(p=> p.key===key? {...p, quantity:p.quantity+1}:p);
      return [...prev, { key, menuItemId:item.id, name: item.name + (variant?` (${variant.name})`:"") + (addOns.length?` +${addOns.map(a=>a.name).join(",")}`:""), quantity:1, unitPrice: unit, variantId, addOnIds }];
    });
  }
  function updateQty(key:string, d:number){ setCart(p=> p.flatMap(x=> x.key===key? (x.quantity+d<=0? []: [{...x, quantity:x.quantity+d}]):[x])); }
  const subtotal=cart.reduce((a,c)=>a+c.unitPrice*c.quantity,0);
  const tax=Math.round(subtotal*0.05);
  const deliveryFee= orderType==="DELIVERY"? 40:0;
  const total= subtotal + tax + deliveryFee - discount;

  async function applyCoupon(){
    if(!coupon.trim()){ setCouponMsg("Enter coupon"); return; }
    const r=await fetch("/api/coupons/redeem",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ code: coupon, orderTotal: subtotal })});
    const j=await r.json();
    if(r.ok){ setDiscount(j.discount); setCouponMsg(`Applied ${j.coupon.code} → discount ₹${j.discount}`); }
    else { setDiscount(0); setCouponMsg(j.error||"Invalid coupon"); }
  }

  async function checkout(){
    if(cart.length===0){ alert("Cart empty"); return; }
    if(!customer.name || !customer.phone){ alert("Name and phone required"); return; }
    if(!/^[6-9]\d{9}$/.test(customer.phone)){ alert("Invalid phone"); return; }
    if(orderType==="DELIVERY" && !address.address.trim()){ alert("Delivery address required"); return; }
    setPlacing(true);
    const payload={
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      address: orderType==="DELIVERY"? address.address : (orderType==="TAKEAWAY"? "Takeaway — counter pickup":"Dine-in"),
      area: address.area,
      instructions: address.instructions,
      items: cart.map(c=> ({ menuItemId:c.menuItemId, quantity:c.quantity, notes:c.notes, variantId:c.variantId, addOnIds:c.addOnIds })),
      couponCode: coupon||undefined,
      paymentMethod,
    };
    const r=await fetch("/api/delivery-orders",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(payload)});
    const j=await r.json();
    setPlacing(false);
    if(!r.ok){ alert(j.error||"Checkout failed"); return; }
    setResult({ orderNumber: j.orderNumber, id: j.id, totalAmount: j.totalAmount });
    setCart([]); setDiscount(0); setCoupon(""); setCouponMsg("");
  }

  const filtered=menu.filter(m=> (filterCat==="ALL"|| m.categoryId===filterCat) && (!search || m.name.toLowerCase().includes(search.toLowerCase()))).slice(0,80);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/order" className="font-bold text-lg">Spice Garden • Online Order</Link>
          <div className="flex items-center gap-2">
            <Badge>{orderType}</Badge>
            <Link href="/order/track" className="text-sm underline">Track</Link>
            <Link href="/login" className="text-sm underline hidden md:block">Admin</Link>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <CardTitle className="text-base">Menu</CardTitle>
                <div className="flex gap-2">
                  {(["DINE_IN","TAKEAWAY","DELIVERY"] as const).map(t=> <Button key={t} size="sm" variant={orderType===t?"default":"outline"} onClick={()=> setOrderType(t)}>{t.replace("_"," ")}</Button>)}
                </div>
              </div>
              <CardDescription className="flex gap-2 mt-2">
                <Input placeholder="Search dishes…" value={search} onChange={e=>setSearch(e.target.value)} className="max-w-[200px] h-8" />
                <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} className="border rounded h-8 px-2 text-sm"><option value="ALL">All Categories</option>{categories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[70vh] overflow-auto pr-1">
                {filtered.map(m=>(
                  <div key={m.id} className={`border rounded-lg p-3 space-y-2 bg-white dark:bg-zinc-900 ${m.isAvailable?"hover:shadow":"opacity-50"}`}>
                    <div className="flex justify-between gap-2"><div className="font-medium text-sm leading-tight">{m.name}</div><span className={`h-2 w-2 rounded-full mt-1 ${m.isVeg?"bg-green-600":"bg-red-600"}`} /></div>
                    <div className="text-xs text-zinc-500">₹{m.price} • {m.isAvailable?"Available":"Out"}</div>
                    {Boolean(m.variants?.length) && <select defaultValue="" onChange={e=> e.target.value && add(m, e.target.value)} className="w-full border rounded h-7 text-xs px-1"><option value="">Variant…</option>{m.variants!.map(v=> <option key={v.id} value={v.id}>{v.name} (+₹{v.priceDelta})</option>)}</select>}
                    <Button size="sm" className="w-full h-7 text-xs" disabled={!m.isAvailable} onClick={()=> add(m)}>Add to Cart</Button>
                    {Boolean(m.addOns?.length) && <div className="text-xs text-zinc-500">Add-ons: {m.addOns!.map(a=> `${a.name} (+₹${a.price})`).join(", ")}</div>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Cart • {cart.reduce((a,c)=>a+c.quantity,0)} items</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {cart.length===0? <div className="text-sm text-zinc-500 border border-dashed rounded p-6 text-center">Your cart is empty — add dishes from menu</div> :
                <div className="space-y-2 max-h-[28vh] overflow-auto">
                  {cart.map(c=>(
                    <div key={c.key} className="flex gap-2 items-center border rounded p-2">
                      <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{c.name}</div><div className="text-xs text-zinc-500">₹{c.unitPrice} × {c.quantity} = ₹{c.unitPrice*c.quantity}</div><Input placeholder="Notes" value={c.notes||""} onChange={e=> setCart(prev=> prev.map(p=> p.key===c.key? {...p, notes:e.target.value}:p))} className="h-6 text-xs mt-1" /></div>
                      <div className="flex items-center gap-1"><Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={()=> updateQty(c.key,-1)}>-</Button><span className="text-sm w-6 text-center">{c.quantity}</span><Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={()=> updateQty(c.key,1)}>+</Button></div>
                    </div>
                  ))}
                </div>
              }
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal}</span></div>
                <div className="flex justify-between"><span>Tax 5%</span><span>₹{tax}</span></div>
                <div className="flex justify-between"><span>Delivery fee</span><span>₹{deliveryFee}</span></div>
                {discount>0 && <div className="flex justify-between text-green-600"><span>Coupon</span><span>-₹{discount}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>₹{total}</span></div>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Coupon code e.g. SPICE1000" value={coupon} onChange={e=>setCoupon(e.target.value)} className="h-8" />
                <Button size="sm" variant="outline" onClick={applyCoupon}>Apply</Button>
              </div>
              {couponMsg && <div className="text-xs bg-zinc-50 border rounded p-2">{couponMsg}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Customer & Address</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Name*</Label><Input value={customer.name} onChange={e=>setCustomer({...customer, name:e.target.value})} placeholder="Your name" /></div>
              <div><Label>Mobile* (10 digits)</Label><Input value={customer.phone} onChange={e=>setCustomer({...customer, phone:e.target.value})} placeholder="9876543210" /></div>
              <div><Label>Email</Label><Input value={customer.email} onChange={e=>setCustomer({...customer, email:e.target.value})} placeholder="you@example.com" /></div>
              {orderType==="DELIVERY" && <>
                <div><Label>Delivery Address*</Label><Textarea value={address.address} onChange={e=>setAddress({...address, address:e.target.value})} placeholder="House no, street, landmark" rows={2} /></div>
                <div><Label>Area</Label><Input value={address.area} onChange={e=>setAddress({...address, area:e.target.value})} placeholder="Kothrud / Baner" /></div>
                <div><Label>Delivery Instructions</Label><Input value={address.instructions} onChange={e=>setAddress({...address, instructions:e.target.value})} placeholder="Ring bell, leave at door…" /></div>
              </>}
              <div><Label>Payment Method</Label><select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value as never)} className="w-full border rounded h-9 px-3 text-sm"><option>CASH</option><option>CARD</option><option>UPI</option><option>ONLINE</option></select><div className="text-xs text-zinc-500 mt-1">Mock payment — always succeeds (PAYMENT_PROVIDER=mock)</div></div>
              <Button onClick={checkout} disabled={placing || cart.length===0} className="w-full">{placing?"Placing…":"Place Order • Payment-ready Checkout"}</Button>
              {result && <div className="bg-green-50 border border-green-200 rounded p-3 text-sm space-y-1">
                <div className="font-bold text-green-800">✓ Order Placed: {result.orderNumber}</div>
                <div>Total ₹{result.totalAmount} • Track with ID</div>
                <Link href={`/order/track/${result.id}`} className="underline text-xs">Track Order →</Link>
              </div>}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
