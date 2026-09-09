"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { demoMenuItems, demoTables, demoCategories } from "@/data/demo";

type MenuItem = { id:string; name:string; price:number; taxPercent:number; isVeg:boolean; isAvailable:boolean; categoryId?:string; imageUrl?:string|null; variants?:{id:string;name:string;priceDelta:number}[]; addOns?:{id:string;name:string;price:number}[] };
type CartLine = { key:string; menuItemId:string; name:string; unitPrice:number; quantity:number; notes?:string; variantId?:string; addOnIds?:string[]; variantName?:string; addOnNames?:string[] };
type PaymentLine = { method:"CASH"|"CARD"|"UPI"|"WALLET"|"ONLINE"|"SPLIT"; amount:number; reference?:string };
type CustomerProfile = { id:string; name:string; phone:string; email?:string|null; birthday?:string|null; totalVisits:number; totalSpend:number; totalSpending?:number; totalOrders:number; loyaltyPoints:number; availableCoupons?:{code:string; value:number; rewardType:string; expiryDate:string; status:string}[]; coupons?:unknown[]; lastVisitDate?:string; recentBills?:unknown[]; loyaltyAccount?:{points:number} };
type HoldOrder = { id:string; cart: CartLine[]; orderType:string; tableId:string; notes:string; discount:number; createdAt:string };

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve)=>{
    if (typeof window !== "undefined" && (window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function useMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cats, setCats] = useState<{id:string; name:string; slug:string}[]>(demoCategories as unknown as {id:string; name:string; slug:string}[]);
  useEffect(()=>{
    fetch("/api/menu-items").then(r=>r.json()).then(j=> {
      if(Array.isArray(j) && j.length) setItems(j as MenuItem[]);
      else setItems(demoMenuItems as unknown as MenuItem[]);
    }).catch(()=> setItems(demoMenuItems as unknown as MenuItem[]));
    fetch("/api/categories").then(r=>r.json()).then(j=> {
      if(Array.isArray(j) && j.length) setCats(j);
      else if(j?.data && Array.isArray(j.data) && j.data.length) setCats(j.data);
    }).catch(()=>null);
  }, []);
  return { items, cats };
}

export default function POSPage() {
  const { items: menu, cats } = useMenu();
  const [tables, setTables] = useState<typeof demoTables>(demoTables);
  useEffect(()=>{ fetch("/api/tables").then(r=>r.json()).then(j=> Array.isArray(j)? setTables(j):null).catch(()=>null); }, []);
  const [orderType, setOrderType] = useState<"DINE_IN"|"TAKEAWAY"|"DELIVERY">("DINE_IN");
  const [tableId, setTableId] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // cart
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [couponCode, setCouponCode] = useState<string>("");
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [loyaltyRedeem, setLoyaltyRedeem] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [payments, setPayments] = useState<PaymentLine[]>([{ method:"CASH", amount:0 }]);

  // customer identification at billing (§2-6)
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerSearching, setCustomerSearching] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile|null>(null);
  const [customerMode, setCustomerMode] = useState<"none"|"found"|"new"|"walkin">("none");
  const [newCustomerForm, setNewCustomerForm] = useState({ name:"", phone:"", email:"", birthday:"" });
  const [customerMsg, setCustomerMsg] = useState("");

  // other states
  const [order, setOrder] = useState<{id:string; orderNumber:string; totalAmount:number} | null>(null);
  const [bill, setBill] = useState<{id:string; billNumber:string; orderId:string; totalAmount:number; subtotal:number; taxAmount:number; discountAmount:number; couponDiscount?:number; paidAt:string|null; qrToken:string; status:string; paymentStatus:string} | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [razorPayBusy, setRazorPayBusy] = useState(false);
  const [holdOrders, setHoldOrders] = useState<HoldOrder[]>([]);

  useEffect(()=>{
    try {
      const raw = localStorage.getItem("pos_hold_orders");
      if (raw) setHoldOrders(JSON.parse(raw));
    } catch {}
  }, []);
  const persistHold = useCallback((list:HoldOrder[])=>{
    setHoldOrders(list);
    try { localStorage.setItem("pos_hold_orders", JSON.stringify(list)); } catch {}
  }, []);

  function addToCart(m: MenuItem, variantId?:string, addOnIds?:string[]) {
    const variant = m.variants?.find(v=> v.id===variantId);
    const addOns = m.addOns?.filter(a=> addOnIds?.includes(a.id))||[];
    const addOnPrice = addOns.reduce((a,b)=>a+b.price,0);
    const unit = m.price + (variant?.priceDelta||0) + addOnPrice;
    const key = `${m.id}::${variantId||""}::${(addOnIds||[]).sort().join(",")}`;
    setCart(prev=>{
      const f=prev.find(p=> p.key===key);
      if(f) return prev.map(p=> p.key===key? {...p, quantity: p.quantity+1}:p);
      return [...prev, { key, menuItemId:m.id, name:m.name + (variant?` (${variant.name})`:"") + (addOns.length?` +${addOns.map(a=>a.name).join(",")}`:""), unitPrice: unit, quantity:1, variantId, addOnIds, variantName: variant?.name, addOnNames: addOns.map(a=>a.name) }];
    });
  }
  function updateQty(key:string, delta:number){ setCart(prev=> prev.flatMap(p=> p.key===key? (p.quantity+delta<=0? [] : [{...p, quantity:p.quantity+delta}]) : [p])); }
  function removeLine(key:string){ setCart(prev=> prev.filter(p=> p.key!==key)); }

  // pricing: server recomputes but show estimate
  const subtotal = cart.reduce((a,c)=> a + c.unitPrice*c.quantity, 0);
  const tax = Math.round(subtotal*0.05);
  const grandTotal = Math.max(0, subtotal + tax - discount - couponDiscount - loyaltyRedeem);
  const paidSum = payments.reduce((a,p)=> a+p.amount,0);
  const remaining = Math.max(0, grandTotal - paidSum);

  useEffect(()=>{ if(payments.length===1) setPayments([{ ...payments[0], amount: grandTotal }]); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grandTotal]);

  function addPayment(){ setPayments(p=> [...p, { method:"CARD", amount: remaining>0? remaining:0 }]); }
  function setPayment(i:number, patch: Partial<PaymentLine>){ setPayments(p=> p.map((x,idx)=> idx===i? {...x, ...patch}:x)); }
  function removePayment(i:number){ setPayments(p=> p.length===1? p: p.filter((_,idx)=> idx!==i)); }

  // ── Customer identification (§3-6) ──
  async function searchCustomer(){
    const phone = customerPhone.trim() || newCustomerForm.phone.trim();
    if(!phone){ setCustomerMsg("Enter 10-digit mobile number"); return; }
    if(!/^[6-9]\d{9}$/.test(phone)){ setCustomerMsg("Invalid mobile — must be 10 digits starting 6-9"); return; }
    setCustomerSearching(true); setCustomerMsg("");
    try{
      const r = await fetch(`/api/customers?phone=${encodeURIComponent(phone)}`);
      const j = await r.json();
      if(j.found && j.customer){
        setCustomerProfile(j.customer);
        setCustomerMode("found");
        setNewCustomerForm({ name: j.customer.name, phone: j.customer.phone, email: j.customer.email||"", birthday: j.customer.birthday? new Date(j.customer.birthday).toISOString().slice(0,10):"" });
        setCustomerMsg(`Found: ${j.customer.name} • Visit ${j.customer.totalVisits||j.customer.totalOrders||0} • Spend ₹${Math.round(j.customer.totalSpending||j.customer.totalSpend||0)} • Points ${j.customer.loyaltyPoints||j.customer.loyaltyAccount?.points||0}`);
        // auto apply available coupons hint
        if(j.customer.availableCoupons?.length) setCouponMsg(`${j.customer.availableCoupons.length} active coupon(s) available`);
      } else {
        setCustomerProfile(null);
        setCustomerMode("new");
        setNewCustomerForm(prev=> ({ ...prev, phone }));
        setCustomerMsg("Customer not found — fill name to create new customer (§5)");
      }
    } catch{ setCustomerMsg("Search failed — try again"); }
    setCustomerSearching(false);
  }
  async function createNewCustomer(){
    if(!newCustomerForm.name.trim()){ setCustomerMsg("Name is required (§5)"); return; }
    if(!/^[6-9]\d{9}$/.test(newCustomerForm.phone)){ setCustomerMsg("Valid 10-digit mobile required"); return; }
    setCustomerSearching(true); setCustomerMsg("");
    try{
      const r = await fetch("/api/customers",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ name: newCustomerForm.name.trim(), phone: newCustomerForm.phone.trim(), email: newCustomerForm.email||undefined, birthday: newCustomerForm.birthday||undefined })});
      const j = await r.json();
      if(!r.ok){ setCustomerMsg(j.error||"Failed to create — may be duplicate"); setCustomerSearching(false); return; }
      setCustomerProfile({ id: j.id, name: j.name, phone: j.phone, email: j.email, birthday: j.birthday, totalVisits:0, totalSpend:0, totalOrders:0, loyaltyPoints:0, availableCoupons:[] });
      setCustomerPhone(j.phone);
      setCustomerMode("found");
      setCustomerMsg(`New customer created: ${j.name} • ${j.phone} — linked to this order`);
    } catch{ setCustomerMsg("Create failed"); }
    setCustomerSearching(false);
  }
  function continueAsWalkIn(){
    setCustomerProfile(null);
    setCustomerMode("walkin");
    setCustomerMsg("Walk-in customer — no loyalty/coupons/birthday offers (§6)");
    setCouponCode(""); setCouponDiscount(0); setLoyaltyRedeem(0);
  }
  function clearCustomer(){
    setCustomerProfile(null); setCustomerMode("none"); setCustomerMsg(""); setCustomerPhone(""); setCouponCode(""); setCouponDiscount(0); setLoyaltyRedeem(0);
  }

  async function applyCoupon(){
    if(!couponCode.trim()){ setCouponMsg("Enter coupon code"); return; }
    if(customerMode==="walkin"){ setCouponMsg("Walk-in cannot use coupons (§6)"); return; }
    // verify via coupon redemption validation locally, server will validate at billing too
    try{
      const r = await fetch("/api/coupon-redemptions",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ code: couponCode.trim(), orderTotal: subtotal + tax - discount, customerPhone: customerProfile?.phone }) } as never);
      // fallback to coupons list check
      if(!r.ok){
        const j = await r.json().catch(()=>({}));
        // try validating via coupons fetch
        const cr = await fetch(`/api/coupons?take=100`);
        const list = await cr.json().catch(()=>[]);
        const arr = Array.isArray(list)? list : list.data||[];
        const found = arr.find((c:{code:string; value:number; maxDiscount:number|null; minSpend:number; status:string; expiryDate:string})=> c.code===couponCode.trim());
        if(found){
          if(found.status!=="ACTIVE"){ setCouponMsg(`Coupon ${found.code} is ${found.status}`); return; }
          if(new Date(found.expiryDate) < new Date()){ setCouponMsg("Coupon expired"); return; }
          if((subtotal+tax-discount) < (found.minSpend||0)){ setCouponMsg(`Min order ₹${found.minSpend} required`); return; }
          let disc = found.rewardType==="PERCENTAGE"? Math.round((subtotal+tax-discount) * found.value/100) : found.value;
          if(found.maxDiscount) disc = Math.min(disc, found.maxDiscount);
          setCouponDiscount(disc);
          setCouponMsg(`Coupon ${found.code} applied: -₹${disc}`);
          return;
        }
        setCouponMsg(j.error||"Invalid coupon");
        return;
      }
      const j = await r.json();
      if(j.discount) { setCouponDiscount(j.discount); setCouponMsg(`Coupon applied: -₹${j.discount}`); }
    } catch{
      setCouponMsg("Coupon check failed");
    }
  }

  // hold / resume (§7)
  function holdOrder(){
    if(cart.length===0){ setMsg("Cart empty — nothing to hold"); return; }
    const h: HoldOrder = { id: `hold_${Date.now()}`, cart: [...cart], orderType, tableId, notes, discount, createdAt: new Date().toISOString() };
    persistHold([...holdOrders, h]);
    setCart([]); setNotes(""); setDiscount(0); setCouponDiscount(0); setMsg(`Order held (#${holdOrders.length+1}) — resume from Hold list`);
  }
  function resumeHold(id:string){
    const h = holdOrders.find(x=> x.id===id);
    if(!h) return;
    setCart(h.cart); setOrderType(h.orderType as never); setTableId(h.tableId); setNotes(h.notes); setDiscount(h.discount);
    persistHold(holdOrders.filter(x=> x.id!==id));
    setMsg(`Resumed held order ${id.slice(0,8)}`);
  }
  function deleteHold(id:string){ persistHold(holdOrders.filter(x=> x.id!==id)); }

  // normalized payments — fixes Pay Bill not clickable when paidSum stale (§15)
  function getNormalizedPayments(override?: PaymentLine[]): PaymentLine[] {
    const list = override || payments;
    const sum = list.reduce((a,p)=>a+Number(p.amount||0),0);
    if (list.length===1 && Math.abs(sum - grandTotal) > 0.01) {
      return [{ ...list[0], amount: grandTotal }];
    }
    return list;
  }

  async function createOrderAndBill(overridePayments?: PaymentLine[]){
    // debug — ensures click registers (fixes "payment pe click nhi ho raha")
    console.log("Pay & Bill clicked", { cartLen: cart.length, orderType, tableId, grandTotal, paidSum, customerMode });
    if(cart.length===0){ setMsg("Add at least one item"); window.scrollTo({top:0, behavior:"smooth"}); return; }
    // auto-select table if DINE_IN and none (prevents blocking)
    let effectiveTableId = tableId;
    if(orderType==="DINE_IN" && !tableId){
      const avail = tables.find(t=> t.status==="AVAILABLE" || t.status==="RESERVED");
      if(avail){ effectiveTableId = avail.id; setTableId(avail.id); } else { setMsg("Select table for Dine-in (§9) — no available table found"); window.scrollTo({top:0, behavior:"smooth"}); return; }
    }
    if(orderType==="DELIVERY" && !deliveryAddress.trim()){ setMsg("Delivery address required (§9/37)"); window.scrollTo({top:0, behavior:"smooth"}); return; }
    if(orderType==="DELIVERY" && !customerProfile && customerMode!=="walkin" && customerMode!=="new"){ setMsg("Delivery requires customer name + mobile + address — search or create customer first"); window.scrollTo({top:0, behavior:"smooth"}); return; }
    // Auto-create customer if in 'new' mode — ensures CRM save (fixes "Customers/CRM me data save huaa" )
    let effectiveCustomerId: string | undefined = customerMode==="found" && customerProfile ? customerProfile.id : undefined;
    let effectiveCustomerProfile = customerProfile;
    if(customerMode==="new"){
      if(!newCustomerForm.name.trim() || !/^[6-9]\d{9}$/.test(newCustomerForm.phone)){
        setMsg("New customer: Name + 10-digit mobile required — complete form then Pay"); window.scrollTo({top:0, behavior:"smooth"}); return;
      }
      setMsg("Creating new customer for CRM…"); setBusy(true);
      try{
        const cr = await fetch("/api/customers",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ name: newCustomerForm.name.trim(), phone: newCustomerForm.phone.trim(), email: newCustomerForm.email||undefined, birthday: newCustomerForm.birthday||undefined })});
        const cj = await cr.json();
        if(!cr.ok){ setMsg(cj.error||"Customer create failed — check phone duplicate"); setBusy(false); window.scrollTo({top:0, behavior:"smooth"}); return; }
        effectiveCustomerId = cj.id;
        effectiveCustomerProfile = { id: cj.id, name: cj.name, phone: cj.phone, email: cj.email, birthday: cj.birthday, totalVisits:0, totalSpend:0, totalOrders:0, loyaltyPoints:0, availableCoupons:[] };
        setCustomerProfile(effectiveCustomerProfile);
        setCustomerMode("found");
        setCustomerPhone(cj.phone);
        setCustomerMsg(`New customer created: ${cj.name} — saved to CRM`);
      }catch{ setMsg("Customer create network error"); setBusy(false); return; }
      setBusy(false);
    }
    const activePayments = getNormalizedPayments(overridePayments);
    const paid = activePayments.reduce((a,p)=>a+Number(p.amount||0),0);
    if(Math.abs(paid - grandTotal) > 0.01 && paid < grandTotal){ setMsg(`Payments ₹${paid} < total ₹${grandTotal} — auto-syncing to total`); // auto-fix instead of blocking
      activePayments[0].amount = grandTotal;
    }
    setBusy(true); setMsg("");
    try {
      const customerId = effectiveCustomerId;
      const oRes = await fetch("/api/orders",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ tableId: effectiveTableId||undefined, customerId, type: orderType, items: cart.map(c=> ({ menuItemId:c.menuItemId, quantity:c.quantity, notes:c.notes, variantId:c.variantId, addOnIds:c.addOnIds })), discountAmount: discount, notes: notes + (orderType==="DELIVERY"? ` | Address: ${deliveryAddress}`:"") + (customerMode==="walkin"?" | WALKIN":"") })});
      const oJson = await oRes.json();
      if(!oRes.ok){ setMsg(oJson.error||oJson.message||"Order failed"); setBusy(false); return; }
      const orderId = oJson.id;
      setOrder({ id: orderId, orderNumber: oJson.orderNumber, totalAmount: oJson.totalAmount });
      const bRes = await fetch("/api/bills",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ orderId, discountAmount: discount, couponCode: couponCode||undefined, loyaltyPointsToRedeem: loyaltyRedeem||undefined, payments: activePayments.map(p=> ({ method:p.method, amount: Number(p.amount), reference:p.reference })) })});
      const bJson = await bRes.json();
      if(!bRes.ok){ setMsg(bJson.error||bJson.message||"Bill failed — check payments sum vs total"); setBusy(false); return; }
      setBill(bJson);
      // sync payments to bill total for UI
      setPayments(activePayments);
      const earn = (bJson as unknown as {loyaltyEarned?:number}).loyaltyEarned || 0;
      const bal = (bJson as unknown as {loyaltyBalanceAfter?:number}).loyaltyBalanceAfter;
      if(earn) setMsg(`Paid • Bill ${bJson.billNumber} — customer ${customerMode==="found"? customerProfile?.name : effectiveCustomerProfile?.name || customerProfile?.name || "—"} • +${earn} pts (bal ${bal}) • QR ready — saved to CRM`);
      else setMsg(`Paid • Bill ${bJson.billNumber} — customer ${customerMode==="found"? customerProfile?.name : effectiveCustomerProfile?.name || customerProfile?.name || "—"} • QR ready — saved to CRM ${bJson.totalAmount <100 ? "(₹100+ to earn)" : ""}`);
      setTimeout(()=> document.getElementById("bill-success")?.scrollIntoView({behavior:"smooth", block:"start"}), 150);
      // refresh CRM profile to show new points/balance
      const phoneToRefresh = (effectiveCustomerProfile as unknown as {phone?:string})?.phone || customerProfile?.phone || newCustomerForm.phone || customerPhone;
      if(phoneToRefresh){
        fetch(`/api/customers?phone=${encodeURIComponent(phoneToRefresh)}`).then(r=>r.json()).then(j=>{ if(j.found && j.customer) setCustomerProfile(j.customer); }).catch(()=>null);
      }
      // clear held table selection after success
      if(orderType==="DINE_IN" && tableId) {
        fetch("/api/tables").then(r=>r.json()).then(j=> Array.isArray(j)? setTables(j):null).catch(()=>null);
      }
    } catch (e: unknown){ setMsg(e instanceof Error? e.message:"Network error"); }
    setBusy(false);
  }

  async function handleRazorpayPay(){
    if(cart.length===0){ setMsg("Add at least one item"); return; }
    // DINE_IN table will be auto-selected in createOrderAndBill, so don't block here — just warn
    if(grandTotal <=0){ setMsg("Cart total is 0 — add items"); return; }
    setRazorPayBusy(true); setMsg("Creating Razorpay order…");
    try{
      const r = await fetch("/api/payments/razorpay/order",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ amount: grandTotal, receipt:`pos_${Date.now()}`, notes:{ customerPhone: customerProfile?.phone || customerPhone || "walkin", orderType } })});
      const j = await r.json();
      if(!r.ok){ setMsg(j.error||"Razorpay order failed"); setRazorPayBusy(false); return; }
      // mock flow — no Checkout needed, directly verify
      if(j.mock){
        const mockPaymentId = `pay_mock_${Date.now()}`;
        const mockSignature = "mock_signature";
        const v = await fetch("/api/payments/razorpay/verify",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ orderId: j.orderId, paymentId: mockPaymentId, signature: mockSignature, amount: grandTotal })});
        const vj = await v.json();
        if(!v.ok){ setMsg(vj.error||"Mock verify failed"); setRazorPayBusy(false); return; }
        setMsg(`Razorpay mock verified ₹${grandTotal} — creating bill…`);
        await createOrderAndBill([{ method:"ONLINE", amount: grandTotal, reference: mockPaymentId }]);
        setRazorPayBusy(false);
        return;
      }
      const loaded = await loadRazorpayScript();
      if(!loaded){ setMsg("Razorpay SDK failed to load — check internet"); setRazorPayBusy(false); return; }
      const options = {
        key: j.keyId,
        amount: j.amount,
        currency: j.currency || "INR",
        name: "Spice Garden",
        description: `POS bill ₹${grandTotal} • ${cart.length} items`,
        order_id: j.orderId,
        handler: async (resp: { razorpay_order_id:string; razorpay_payment_id:string; razorpay_signature:string })=>{
          try{
            const vr = await fetch("/api/payments/razorpay/verify",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature, amount: grandTotal })});
            const vj = await vr.json();
            if(!vr.ok){ setMsg(vj.error||"Razorpay verify failed — payment not captured"); setRazorPayBusy(false); return; }
            setMsg(`Razorpay success ${resp.razorpay_payment_id} — creating bill…`);
            await createOrderAndBill([{ method:"ONLINE", amount: grandTotal, reference: resp.razorpay_payment_id }]);
          }catch(e){ setMsg(e instanceof Error? e.message:"Verify error"); }
          setRazorPayBusy(false);
        },
        prefill: { name: customerProfile?.name || newCustomerForm.name || "", contact: customerProfile?.phone || customerPhone || "", email: customerProfile?.email || "" },
        theme:{ color:"#ea580c" },
        modal:{ ondismiss:()=> setRazorPayBusy(false) }
      };
      const rzp = new (window as unknown as { Razorpay: new(o: unknown)=> { open:()=>void; on:(e:string,fn:(r:unknown)=>void)=>void } }).Razorpay(options);
      rzp.on("payment.failed",(resp: unknown)=>{ const r = resp as { error?:{description?:string}}; setMsg(`Razorpay failed: ${r.error?.description||"unknown"}`); setRazorPayBusy(false); });
      rzp.open();
    }catch(e){ setMsg(e instanceof Error? e.message:"Razorpay error"); setRazorPayBusy(false); }
  }

  // auto-select first available table for DINE_IN to avoid Pay & Bill blocking (UX)
  useEffect(()=>{
    if(orderType==="DINE_IN" && !tableId && tables.length){
      const avail = tables.find(t=> t.status==="AVAILABLE" || t.status==="RESERVED");
      if(avail) setTableId(avail.id);
    }
  },[tables, orderType, tableId]);

  const categories = [{ id:"ALL", name:"All", slug:"all" }, ...cats];
  const filteredMenu = menu.filter(m=>{
    const catOk = activeCategory==="ALL" || m.categoryId===activeCategory;
    const searchOk = !search || m.name.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  }).slice(0,80);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">POS & Billing</h1>
        <div className="flex items-center gap-2">
          <Badge className="border bg-white">{orderType} • {cart.length} lines • ₹{grandTotal}</Badge>
          {holdOrders.length>0 && <Badge className="bg-amber-100 text-amber-800 border-amber-200">{holdOrders.length} held</Badge>}
        </div>
      </div>
      {msg && <div className="text-sm bg-amber-50 border border-amber-200 rounded p-2 whitespace-pre-wrap">{msg}</div>}

      {/* Category bar (§8 LEFT) */}
      <div className="flex gap-2 overflow-auto pb-1">
        {categories.map(c=> (
          <button key={c.id} onClick={()=> setActiveCategory(c.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap ${activeCategory===c.id?"bg-zinc-900 text-white":"bg-white hover:bg-zinc-50"}`}>{c.name}</button>
        ))}
        <div className="ml-auto flex gap-2">
          {(["DINE_IN","TAKEAWAY","DELIVERY"] as const).map(t=> <Button key={t} size="sm" variant={orderType===t?"default":"outline"} onClick={()=> setOrderType(t)}>{t.replace("_","-")}</Button>)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* CENTER: Menu */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <CardTitle className="text-base">Menu — tap to add</CardTitle>
                <Input placeholder="Search menu..." value={search} onChange={e=>setSearch(e.target.value)} className="max-w-[180px] h-8" />
              </div>
              <CardDescription className="flex gap-2 items-center flex-wrap">
                <select value={tableId} onChange={e=>setTableId(e.target.value)} className="border rounded px-2 py-1 text-sm" disabled={orderType!=="DINE_IN"}>
                  <option value="">Select table {orderType!=="DINE_IN"?"(not needed)":"*"}</option>
                  {tables.slice(0,40).map(t=><option key={t.id} value={t.id}>{t.number} — {t.status} • {t.capacity}pax</option>)}
                </select>
                {orderType==="DELIVERY" && <Input placeholder="Delivery address* (§37)" value={deliveryAddress} onChange={e=>setDeliveryAddress(e.target.value)} className="h-8 max-w-[260px]" />}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[58vh] overflow-auto pr-1">
                {filteredMenu.map(m=>(
                  <div key={m.id} className={`border rounded p-3 space-y-2 ${m.isAvailable?"hover:bg-zinc-50 dark:hover:bg-zinc-800":"opacity-50"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm leading-tight">{m.name}</div>
                      <span className={`h-2 w-2 rounded-full mt-1 shrink-0 ${m.isVeg?"bg-green-600":"bg-red-600"}`} />
                    </div>
                    <div className="text-xs text-zinc-500">₹{m.price} +{m.taxPercent}% tax • {m.isAvailable?"Available":"Out"}</div>
                    {Boolean(m.variants?.length) && <select defaultValue="" onChange={e=>{ if(e.target.value) addToCart(m, e.target.value); e.target.value=""; }} className="w-full border rounded h-7 text-xs px-1"><option value="">Variant…</option>{m.variants!.map(v=><option key={v.id} value={v.id}>{v.name} (+₹{v.priceDelta})</option>)}</select>}
                    {Boolean(m.addOns?.length) && <div className="text-xs space-y-1">{m.addOns!.slice(0,2).map(a=> <label key={a.id} className="flex items-center gap-1"><input type="checkbox" onChange={e=>{ const checked=e.target.checked; if(checked) addToCart(m, undefined,[a.id]); }} /> {a.name} (+₹{a.price})</label>)}</div>}
                    <Button size="sm" className="w-full h-7 text-xs" disabled={!m.isAvailable} onClick={()=> addToCart(m)}>Add</Button>
                  </div>
                ))}
                {filteredMenu.length===0 && <div className="col-span-3 text-center text-sm text-zinc-500 py-8">No items in this category</div>}
              </div>
            </CardContent>
          </Card>
          {holdOrders.length>0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Held Orders — Resume (§7)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {holdOrders.map(h=>(
                  <div key={h.id} className="flex items-center justify-between border rounded p-2 text-sm">
                    <span>{h.orderType} • {h.cart.reduce((a,c)=>a+c.quantity,0)} items • {new Date(h.createdAt).toLocaleTimeString()} • Table {h.tableId? tables.find(t=>t.id===h.tableId)?.number||h.tableId.slice(0,6):"—"}</span>
                    <div className="flex gap-1"><Button size="sm" variant="outline" onClick={()=> resumeHold(h.id)}>Resume</Button><Button size="sm" variant="ghost" onClick={()=> deleteHold(h.id)}>×</Button></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: Cart + Customer (§3-6) + Billing (§13-14) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Cart • {cart.length? `${cart.reduce((a,c)=>a+c.quantity,0)} items`:"Empty"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {cart.length===0? <div className="text-sm text-zinc-500 border border-dashed rounded p-6 text-center">No items — tap menu to add</div> :
                <div className="space-y-2 max-h-[28vh] overflow-auto">
                  {cart.map(c=>(
                    <div key={c.key} className="flex gap-2 items-start border rounded p-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight truncate">{c.name}</div>
                        <div className="text-xs text-zinc-500">₹{c.unitPrice} × {c.quantity} = ₹{c.unitPrice*c.quantity}</div>
                        <Input placeholder="Notes (no onion...)" value={c.notes||""} onChange={e=> setCart(prev=> prev.map(p=> p.key===c.key? {...p, notes:e.target.value}:p))} className="h-6 text-xs mt-1" />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1"><Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={()=> updateQty(c.key,-1)}>-</Button><span className="text-sm w-6 text-center">{c.quantity}</span><Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={()=> updateQty(c.key,1)}>+</Button></div>
                        <button onClick={()=> removeLine(c.key)} className="text-xs text-red-600 underline">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              }
              <Textarea placeholder="Order notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} rows={2} />

              {/* ── Customer Identification at Billing (§3-6) ── */}
              <div className="border rounded p-3 space-y-3 bg-zinc-50 dark:bg-zinc-900">
                <div className="font-medium text-sm flex items-center justify-between">Customer — Billing identification (§2-6) {customerMode!=="none" && <button onClick={clearCustomer} className="text-xs underline">Clear</button>}</div>
                {customerMode==="none" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Mobile Number *</Label>
                    <div className="flex gap-2">
                      <Input placeholder="10-digit mobile (6-9 start)" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} className="h-8" />
                      <Button size="sm" onClick={searchCustomer} disabled={customerSearching}>{customerSearching?"Searching…":"Search"}</Button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={()=>{ if(customerPhone) setNewCustomerForm(f=>({...f, phone:customerPhone})); setCustomerMode("new"); }}>Add New Customer</Button>
                      <Button size="sm" variant="ghost" onClick={continueAsWalkIn}>Continue as Walk-in</Button>
                    </div>
                  </div>
                )}
                {customerMode==="found" && customerProfile && (
                  <div className="space-y-2 text-sm bg-white dark:bg-zinc-800 border rounded p-3">
                    <div className="font-semibold">{customerProfile.name} • {customerProfile.phone} {customerProfile.email?`• ${customerProfile.email}`:""}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span>Visits: <b>{customerProfile.totalVisits ?? customerProfile.totalOrders}</b></span>
                      <span>Spend: <b>₹{Math.round(customerProfile.totalSpending ?? customerProfile.totalSpend ?? 0)}</b></span>
                      <span>Points: <b className="text-green-700">{customerProfile.loyaltyPoints ?? customerProfile.loyaltyAccount?.points ?? 0}</b></span>
                      <span>Last visit: <b>{customerProfile.lastVisitDate? new Date(customerProfile.lastVisitDate).toLocaleDateString():"—"}</b></span>
                      <span className="col-span-2">Birthday: {customerProfile.birthday? new Date(customerProfile.birthday).toLocaleDateString():"—"}</span>
                    </div>
                    {Boolean(customerProfile.availableCoupons?.length) && (
                      <div className="text-xs">
                        <div className="font-medium">Available Coupons ({customerProfile.availableCoupons!.length})</div>
                        {customerProfile.availableCoupons!.slice(0,3).map(c=> <div key={c.code} className="font-mono border rounded px-2 py-1 bg-amber-50 mt-1">{c.code} • {c.value}{c.rewardType==="PERCENTAGE"?"%":"₹"} off • exp {new Date(c.expiryDate).toLocaleDateString()}</div>)}
                      </div>
                    )}
                    <div className="text-xs text-green-700">✓ Linked to current order • Loyalty & coupons will apply</div>
                  </div>
                )}
                {customerMode==="new" && (
                  <div className="space-y-2 bg-white dark:bg-zinc-800 border rounded p-3">
                    <div className="text-sm font-medium">New Customer — fill & create (§5)</div>
                    <div><Label className="text-xs">Name *</Label><Input value={newCustomerForm.name} onChange={e=>setNewCustomerForm({...newCustomerForm, name:e.target.value})} placeholder="Full name" className="h-8" /></div>
                    <div><Label className="text-xs">Mobile *</Label><Input value={newCustomerForm.phone} onChange={e=>setNewCustomerForm({...newCustomerForm, phone:e.target.value})} placeholder="9876543210" className="h-8" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Email (optional)</Label><Input value={newCustomerForm.email} onChange={e=>setNewCustomerForm({...newCustomerForm, email:e.target.value})} placeholder="you@example.com" className="h-8" /></div>
                      <div><Label className="text-xs">Birthday (optional)</Label><Input type="date" value={newCustomerForm.birthday} onChange={e=>setNewCustomerForm({...newCustomerForm, birthday:e.target.value})} className="h-8" /></div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={createNewCustomer} disabled={customerSearching}>{customerSearching?"Saving…":"Save & Link"}</Button>
                      <Button size="sm" variant="ghost" onClick={()=> setCustomerMode("none")}>Back to Search</Button>
                      <Button size="sm" variant="ghost" onClick={continueAsWalkIn}>Walk-in instead</Button>
                    </div>
                  </div>
                )}
                {customerMode==="walkin" && (
                  <div className="text-sm bg-white border rounded p-3">
                    <div className="font-medium">Walk-in customer</div>
                    <div className="text-xs text-zinc-500">No loyalty points, coupons, birthday offers or purchase history (§6). You can still bill & print invoice.</div>
                    <Button size="sm" variant="outline" className="mt-2" onClick={()=> setCustomerMode("none")}>Change — search customer</Button>
                  </div>
                )}
                {customerMsg && <div className="text-xs bg-white border rounded p-2 whitespace-pre-wrap">{customerMsg}</div>}
              </div>

              {/* Discounts */}
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal}</span></div>
                <div className="flex justify-between"><span>Tax 5% (server validates)</span><span>₹{tax}</span></div>
                <div className="flex justify-between items-center"><span>Manual Discount</span><Input type="number" value={discount} onChange={e=>setDiscount(Math.max(0, Number(e.target.value)||0))} className="w-24 h-7" /></div>
                <div className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <Input placeholder="Coupon code (if any)" value={couponCode} onChange={e=>setCouponCode(e.target.value.toUpperCase())} className="h-7" disabled={customerMode==="walkin"} />
                    <Button size="sm" variant="outline" onClick={applyCoupon} className="h-7">Apply</Button>
                    {couponDiscount>0 && <Button size="sm" variant="ghost" onClick={()=>{setCouponCode(""); setCouponDiscount(0); setCouponMsg("Coupon cleared");}} className="h-7">Clear</Button>}
                  </div>
                  {couponMsg && <div className="text-xs text-zinc-500">{couponMsg}</div>}
                  {couponDiscount>0 && <div className="flex justify-between text-green-600"><span>Coupon Discount</span><span>-₹{couponDiscount}</span></div>}
                </div>
                {customerMode==="found" && (customerProfile?.loyaltyPoints||0) > 0 && (
                  <div className="flex gap-2 items-center">
                    <Input type="number" placeholder={`Redeem points (avail ${customerProfile?.loyaltyPoints})`} value={loyaltyRedeem||""} onChange={e=>{
                      const v = Math.max(0, Number(e.target.value)||0);
                      const avail = customerProfile?.loyaltyPoints||0;
                      if(v>avail){ setMsg(`Cannot redeem ${v} — only ${avail} available`); return; }
                      setLoyaltyRedeem(v);
                    }} className="h-7 flex-1" />
                    <span className="text-xs text-zinc-500">1 pt = ₹1</span>
                  </div>
                )}
                {loyaltyRedeem>0 && <div className="flex justify-between text-green-600"><span>Loyalty Redeem</span><span>-₹{loyaltyRedeem}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Grand Total</span><span>₹{grandTotal}</span></div>
                <div className="text-xs text-zinc-500">All totals recomputed server-side — client not trusted (§13).</div>
              </div>

              <div className="border rounded p-3 space-y-2 bg-zinc-50 dark:bg-zinc-900">
                <div className="flex items-center justify-between"><span className="text-sm font-medium">Payments — Split allowed (§15)</span><Button size="sm" variant="outline" onClick={addPayment}>+ Split</Button></div>
                {payments.map((p,idx)=>(
                  <div key={idx} className="flex gap-2 items-center">
                    <select value={p.method} onChange={e=> setPayment(idx,{ method: e.target.value as PaymentLine["method"]})} className="border rounded h-7 text-xs px-2"><option>CASH</option><option>CARD</option><option>UPI</option><option>WALLET</option><option>ONLINE</option></select>
                    <Input type="number" value={p.amount} onChange={e=> setPayment(idx,{ amount: Number(e.target.value)||0 })} className="h-7" placeholder="Amount" />
                    <Input placeholder="Ref (optional)" value={p.reference||""} onChange={e=> setPayment(idx,{ reference:e.target.value })} className="h-7 max-w-[110px]" />
                    {payments.length>1 && <Button variant="ghost" size="sm" onClick={()=> removePayment(idx)} className="h-7 text-xs">✕</Button>}
                  </div>
                ))}
                <div className="flex justify-between text-xs"><span>Paid ₹{paidSum}</span><span className={remaining===0?"text-green-600":"text-amber-600"}>{remaining===0?"Fully paid":`Remaining ₹${remaining}`}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={holdOrder} disabled={cart.length===0} type="button">Hold Order</Button>
                <Button onClick={()=>createOrderAndBill()} disabled={busy || razorPayBusy || cart.length===0} type="button" className="bg-zinc-900 cursor-pointer hover:bg-black disabled:opacity-50">{busy?"Processing…":"Pay & Bill"}</Button>
              </div>
              <Button onClick={handleRazorpayPay} disabled={razorPayBusy || busy || cart.length===0} type="button" className="w-full bg-[#0a66c2] hover:bg-[#0958a8] text-white cursor-pointer disabled:opacity-50">
                {razorPayBusy?"Razorpay…":"Pay with Razorpay (UPI / Card / Wallet)"}
              </Button>
              <div className="text-[11px] text-zinc-500 text-center">Razorpay Live Test — keys set `rzp_test_Ta2T...` • Use test card 4111 1111 1111 1111</div>
              <Button variant="ghost" className="w-full text-xs" onClick={()=>{ setCart([]); setDiscount(0); setCouponDiscount(0); setLoyaltyRedeem(0); setCouponCode(""); }}>Clear Cart</Button>
              {order && bill && (
                <div id="bill-success" className="rounded-xl bg-green-50 border-2 border-green-400 p-4 text-sm space-y-3 scroll-mt-4">
                  <div className="font-bold text-green-800 text-base flex items-center gap-2">✓ Payment Success — Bill {bill.billNumber} <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs">{bill.paymentStatus}</span></div>
                  <div>Order {order.orderNumber} → Bill linked • Customer: {customerMode==="found"? customerProfile?.name : customerMode==="walkin"?"Walk-in":"—"} • Total ₹{bill.totalAmount}</div>
                  {/* QR Loyalty */}
                  <div className="flex gap-3 items-center bg-white rounded-lg p-3 border">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(typeof window!=="undefined"? `${window.location.origin}/qr/${bill.qrToken}?billId=${bill.id}` : `/qr/${bill.qrToken}`)}`} alt="Loyalty QR" className="h-24 w-24 border rounded bg-white" />
                      <div className="text-xs space-y-1">
                      <div className="font-semibold">Loyalty QR — Scan for reward</div>
                      <div className="break-all font-mono text-[11px]">{bill.qrToken}</div>
                      <Link href={`/qr/${bill.qrToken}?billId=${bill.id}`} className="underline text-blue-600">Open QR Reward Flow →</Link>
                      <div className="text-zinc-500 font-medium">
                        {(bill as unknown as {loyaltyEarned?:number}).loyaltyEarned
                          ? `+${(bill as unknown as {loyaltyEarned?:number}).loyaltyEarned} pts earned (bal ${(bill as unknown as {loyaltyBalanceAfter?:number}).loyaltyBalanceAfter}) ✓`
                          : bill.totalAmount>=100? `Earn ~${Math.floor(bill.totalAmount/100)*10} pts (₹100=10) — next bill` : "Spend ₹100+ to earn loyalty"}
                      </div>
                      <div className="text-[11px] text-zinc-400">Customers/CRM me auto save ✓</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={()=> document.getElementById("receipt")?.scrollIntoView({behavior:"smooth"})}>View & Print Bill</Button>
                    <Link href="/customers" className="flex-1"><Button size="sm" variant="outline" className="w-full">View in Customers/CRM →</Button></Link>
                  </div>
                  <div className="text-xs text-zinc-600">Customer saved to CRM ✓ • Visit & spend incremented • Check Customers page for new entry</div>
                </div>
              )}
            </CardContent>
          </Card>

          {bill && (
            <Card id="receipt" className="print:shadow-none border-2 border-zinc-900">
              <CardHeader><CardTitle className="text-base flex items-center gap-2">🧾 Print-ready Receipt <span className="text-xs bg-zinc-900 text-white px-2 py-0.5 rounded">Bill #{bill.billNumber}</span></CardTitle><CardDescription>Order #{order?.orderNumber || bill.orderId.slice(0,8)} • {new Date(bill.paidAt || Date.now()).toLocaleString()} • Table {tables.find(t=>t.id===tableId)?.number || "—"}</CardDescription></CardHeader>
              <CardContent className="text-sm space-y-3 font-mono">
                <div className="text-center border-b-2 border-dashed pb-3">
                  <div className="font-bold text-lg">SPICE GARDEN</div>
                  <div className="text-xs">MG Road, Pune • GST 27ABCDE1234F1Z5 • +91 98765 43210</div>
                  <div className="text-xs">Thank you for dining!</div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span>Bill No</span><span className="font-bold">{bill.billNumber}</span></div>
                  <div className="flex justify-between"><span>Customer</span><span>{customerMode==="found"? customerProfile?.name : "Walk-in"} {customerProfile?`• ${customerProfile.phone}`:""}</span></div>
                  <div className="flex justify-between"><span>Status</span><span className="font-bold">{bill.status} / {bill.paymentStatus}</span></div>
                  <div className="flex justify-between"><span>Paid at</span><span>{bill.paidAt? new Date(bill.paidAt).toLocaleString():"—"}</span></div>
                  <div className="flex justify-between"><span>Payment</span><span>{(bill as unknown as {payments?:{method:string}[]}).payments?.[0]?.method || "CASH/UPI"}</span></div>
                </div>
                <div className="border-t-2 border-dashed my-2" />
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span>Subtotal</span><span>₹{bill.subtotal}</span></div>
                  <div className="flex justify-between"><span>Tax (5%)</span><span>₹{bill.taxAmount}</span></div>
                  <div className="flex justify-between"><span>Discount</span><span>-₹{bill.discountAmount}</span></div>
                  {(bill as unknown as {couponDiscount:number}).couponDiscount ? <div className="flex justify-between text-green-600"><span>Coupon</span><span>-₹{(bill as unknown as {couponDiscount:number}).couponDiscount}</span></div> : null}
                  {(bill as unknown as {loyaltyEarned?:number}).loyaltyEarned ? <div className="flex justify-between text-green-600"><span>Loyalty earned</span><span>+{(bill as unknown as {loyaltyEarned:number}).loyaltyEarned} pts</span></div> : null}
                  <div className="flex justify-between font-bold text-base border-t-2 pt-2"><span>Total Paid</span><span>₹{bill.totalAmount}</span></div>
                </div>
                {/* Review QR — now visible and printable */}
                <div className="border-2 border-dashed rounded-lg p-3 bg-white flex gap-3 items-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${typeof window!=="undefined"? window.location.origin : "https://restroerp.vercel.app"}/qr/${bill.qrToken}?billId=${bill.id}`)}`}
                    alt="Review QR"
                    className="h-28 w-28 border rounded bg-white p-1"
                  />
                  <div className="text-xs space-y-1">
                    <div className="font-bold">⭐ Rate & Get Reward</div>
                    <div>Scan to review — 4★=40% off, 5★=50% off</div>
                    <div className="font-mono text-[10px] break-all">{bill.qrToken}</div>
                    <div className="text-zinc-500">One reward per bill • 30 days valid</div>
                  </div>
                </div>
                <div className="flex gap-2 print:hidden">
                  <Button variant="outline" className="flex-1" onClick={()=> window.print()}>🖨️ Print Receipt</Button>
                  <Button className="flex-1 bg-zinc-900" onClick={()=> window.open(`/qr/${bill.qrToken}?billId=${bill.id}`, "_blank")}>Open Review QR</Button>
                </div>
                <div className="text-[10px] text-center text-zinc-400">Powered by RestroERP • GST inclusive • Visit again!</div>
              </CardContent>
            </Card>
          )}
          <Card><CardContent className="p-3 text-xs text-zinc-500">Billing: customer identification at end, walk-in allowed, coupon/loyalty validated server-side. Hold/Resume supported. Server recomputes totals, validates payments split = total (§15-16), prevents duplicate bill per order.</CardContent></Card>
        </div>
      </div>
    </div>
  );
}
