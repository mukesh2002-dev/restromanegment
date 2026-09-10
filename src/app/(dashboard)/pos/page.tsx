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
    fetch("/api/menu-items", { cache: 'no-store' }).then(r=>r.json()).then(j=> {
      if(Array.isArray(j) && j.length) setItems(j as MenuItem[]);
      else setItems(demoMenuItems as unknown as MenuItem[]);
    }).catch(()=> setItems(demoMenuItems as unknown as MenuItem[]));
    fetch("/api/categories", { cache: 'no-store' }).then(r=>r.json()).then(j=> {
      if(Array.isArray(j) && j.length) setCats(j);
      else if(j?.data && Array.isArray(j.data) && j.data.length) setCats(j.data);
    }).catch(()=>null);
  }, []);
  return { items, cats };
}

export default function POSPage() {
  const { items: menu, cats } = useMenu();
  const [tables, setTables] = useState<typeof demoTables>([]);
  const [tablesLoaded, setTablesLoaded] = useState(false);
  useEffect(()=>{
    fetch("/api/tables", { cache: 'no-store' }).then(r=>r.json()).then(j=> {
      if(Array.isArray(j) && j.length) setTables(j);
      else setTables(demoTables);
      setTablesLoaded(true);
    }).catch(()=>{ setTables(demoTables); setTablesLoaded(true); });
  }, []);
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

  // customer identification at billing (Â§2-6)
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

  // â”€â”€ Customer identification (Â§3-6) â”€â”€
  async function searchCustomer(){
    const phone = customerPhone.trim() || newCustomerForm.phone.trim();
    if(!phone){ setCustomerMsg("Enter 10-digit mobile number"); return; }
    if(!/^[6-9]\d{9}$/.test(phone)){ setCustomerMsg("Invalid mobile — must be 10 digits starting 6-9"); return; }
    setCustomerSearching(true); setCustomerMsg("");
    try{
      const r = await fetch(`/api/customers?phone=${encodeURIComponent(phone)}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      const j = await r.json();
      if(j.found && j.customer){
        setCustomerProfile(j.customer);
        setCustomerMode("found");
        setNewCustomerForm({ name: j.customer.name, phone: j.customer.phone, email: j.customer.email||"", birthday: j.customer.birthday? new Date(j.customer.birthday).toISOString().slice(0,10):"" });
        setCustomerMsg(`Found: ${j.customer.name} â€¢ Visit ${j.customer.totalVisits||j.customer.totalOrders||0} â€¢ Spend ₹${Math.round(j.customer.totalSpending||j.customer.totalSpend||0)} â€¢ Points ${j.customer.loyaltyPoints||j.customer.loyaltyAccount?.points||0}`);
        // auto apply available coupons hint
        if(j.customer.availableCoupons?.length) setCouponMsg(`${j.customer.availableCoupons.length} active coupon(s) available`);
      } else {
        setCustomerProfile(null);
        setCustomerMode("new");
        setNewCustomerForm(prev=> ({ ...prev, phone }));
        setCustomerMsg("Customer not found — fill name to create new customer (Â§5)");
      }
    } catch{ setCustomerMsg("Search failed — try again"); }
    setCustomerSearching(false);
  }
  async function createNewCustomer(){
    if(!newCustomerForm.name.trim()){ setCustomerMsg("Name is required (Â§5)"); return; }
    if(!/^[6-9]\d{9}$/.test(newCustomerForm.phone)){ setCustomerMsg("Valid 10-digit mobile required"); return; }
    setCustomerSearching(true); setCustomerMsg("");
    try{
      const r = await fetch("/api/customers",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ name: newCustomerForm.name.trim(), phone: newCustomerForm.phone.trim(), email: newCustomerForm.email||undefined, birthday: newCustomerForm.birthday||undefined })});
      const j = await r.json();
      if(!r.ok){ setCustomerMsg(j.error||"Failed to create — may be duplicate"); setCustomerSearching(false); return; }
      setCustomerProfile({ id: j.id, name: j.name, phone: j.phone, email: j.email, birthday: j.birthday, totalVisits:0, totalSpend:0, totalOrders:0, loyaltyPoints:0, availableCoupons:[] });
      setCustomerPhone(j.phone);
      setCustomerMode("found");
      setCustomerMsg(`New customer created: ${j.name} â€¢ ${j.phone} — linked to this order`);
    } catch{ setCustomerMsg("Create failed"); }
    setCustomerSearching(false);
  }
  function continueAsWalkIn(){
    setCustomerProfile(null);
    setCustomerMode("walkin");
    setCustomerMsg("Walk-in customer — no loyalty/coupons/birthday offers (Â§6)");
    setCouponCode(""); setCouponDiscount(0); setLoyaltyRedeem(0);
  }
  function clearCustomer(){
    setCustomerProfile(null); setCustomerMode("none"); setCustomerMsg(""); setCustomerPhone(""); setCouponCode(""); setCouponDiscount(0); setLoyaltyRedeem(0);
  }

  async function applyCoupon(){
    if(!couponCode.trim()){ setCouponMsg("Enter coupon code"); return; }
    if(customerMode==="walkin"){ setCouponMsg("Walk-in cannot use coupons (Â§6)"); return; }
    // verify via coupon redemption validation locally, server will validate at billing too
    try{
      const r = await fetch("/api/coupon-redemptions",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ code: couponCode.trim(), orderTotal: subtotal + tax - discount, customerPhone: customerProfile?.phone }) } as never);
      // fallback to coupons list check
      if(!r.ok){
        const j = await r.json().catch(()=>({}));
        // try validating via coupons fetch
        const cr = await fetch(`/api/coupons?take=100`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
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

  // hold / resume (Â§7)
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

  // normalized payments — fixes Pay Bill not clickable when paidSum stale (Â§15)
  function getNormalizedPayments(override?: PaymentLine[]): PaymentLine[] {
    const list = override || payments;
    const sum = list.reduce((a,p)=>a+Number(p.amount||0),0);
    if (list.length===1 && Math.abs(sum - grandTotal) > 0.01) {
      return [{ ...list[0], amount: grandTotal }];
    }
    return list;
  }

  const [lastError, setLastError] = useState<string>("");
  async function createOrderAndBill(overridePayments?: PaymentLine[]){
    console.log("Pay & Bill clicked", { cartLen: cart.length, orderType, tableId, grandTotal, paidSum, customerMode, customerPhone, cartSample: cart.slice(0,1) });
    if(cart.length===0){ const m="Add at least one item — Step 1: select products"; setMsg(m); setLastError(m); window.scrollTo({top:0, behavior:"smooth"}); return; }
    // auto-resolve customer if phone typed but not yet linked (fixes CRM 0 visits)
    let resolvedCustomer: CustomerProfile | null = customerProfile;
    let resolvedMode = customerMode;
    if(customerMode==="none" && customerPhone.trim() && /^[6-9]\d{9}$/.test(customerPhone.trim())){
      try{
        const cr = await fetch(`/api/customers?phone=${encodeURIComponent(customerPhone.trim())}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
        const cj = await cr.json();
        if(cj.found && cj.customer){
          resolvedCustomer = cj.customer as CustomerProfile;
          resolvedMode = "found";
          setCustomerProfile(resolvedCustomer);
          setCustomerMode("found");
        } else {
          // keep walk-in but don't block
        }
      }catch{}
    }
    let effectiveTableId = tableId;
    // validate existing tableId is still in live tables list (fixes demoId vs DB mismatch P2003)
    if(orderType==="DINE_IN" && tableId && tables.length && !tables.some(t=> t.id===tableId)){
      const avail = tables.find(t=> t.status==="AVAILABLE" || t.status==="RESERVED");
      if(avail){ effectiveTableId = avail.id; setTableId(avail.id); setMsg(`Selected table not found in DB — auto-switched to ${avail.number}`); }
      else { const m="Selected table not found — please refresh tables and reselect (P2003)"; setMsg(m); setLastError(m); return; }
    }
    if(orderType==="DINE_IN" && !effectiveTableId){
      if(!tablesLoaded){ const m="Tables loading — please wait 2 sec and retry"; setMsg(m); setLastError(m); return; }
      const avail = tables.find(t=> t.status==="AVAILABLE" || t.status==="RESERVED");
      if(avail){ effectiveTableId = avail.id; setTableId(avail.id); } else { const m="Step 1: Select table for Dine-in — no available table (all OCCUPIED)"; setMsg(m); setLastError(m); window.scrollTo({top:0, behavior:"smooth"}); return; }
    }
    if(orderType==="DELIVERY" && !deliveryAddress.trim()){ const m="Step 3: Delivery address required"; setMsg(m); setLastError(m); window.scrollTo({top:0, behavior:"smooth"}); return; }
    if(orderType==="DELIVERY" && !resolvedCustomer && resolvedMode!=="walkin" && resolvedMode!=="new"){ const m="Delivery requires customer — Search or Add New Customer first (Step 3)"; setMsg(m); setLastError(m); window.scrollTo({top:0, behavior:"smooth"}); return; }
    let effectiveCustomerId: string | undefined = resolvedMode==="found" && resolvedCustomer ? resolvedCustomer.id : undefined;
    let effectiveCustomerProfile = resolvedCustomer;
    // if we resolved via phone, use that
    if(!effectiveCustomerId && resolvedCustomer && resolvedMode==="found"){ effectiveCustomerId = resolvedCustomer.id; }
    if(resolvedMode==="new"){
      if(!newCustomerForm.name.trim() || !/^[6-9]\d{9}$/.test(newCustomerForm.phone)){
        const m="Step 3: New customer — Name + 10-digit mobile required"; setMsg(m); setLastError(m); window.scrollTo({top:0, behavior:"smooth"}); return;
      }
      setMsg("Creating new customer for CRMâ€¦"); setBusy(true);
      try{
        const cr = await fetch("/api/customers",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ name: newCustomerForm.name.trim(), phone: newCustomerForm.phone.trim(), email: newCustomerForm.email||undefined, birthday: newCustomerForm.birthday||undefined })});
        const cj = await cr.json();
        if(!cr.ok){ const m=cj.error||"Customer create failed — check phone duplicate"; setMsg(m); setLastError(m); setBusy(false); window.scrollTo({top:0, behavior:"smooth"}); return; }
        effectiveCustomerId = cj.id;
        effectiveCustomerProfile = { id: cj.id, name: cj.name, phone: cj.phone, email: cj.email, birthday: cj.birthday, totalVisits:0, totalSpend:0, totalOrders:0, loyaltyPoints:0, availableCoupons:[] };
        setCustomerProfile(effectiveCustomerProfile);
        setCustomerMode("found");
        setCustomerPhone(cj.phone);
        setCustomerMsg(`New customer created: ${cj.name} — saved to CRM`);
      }catch{ const m="Customer create network error"; setMsg(m); setLastError(m); setBusy(false); return; }
      setBusy(false);
    }
    const activePayments = getNormalizedPayments(overridePayments);
    const paid = activePayments.reduce((a,p)=>a+Number(p.amount||0),0);
    if(Math.abs(paid - grandTotal) > 0.01 && paid < grandTotal){ setMsg(`Payments ₹${paid} < total ₹${grandTotal} — auto-syncing to total`); // auto-fix instead of blocking
      activePayments[0].amount = grandTotal;
    }
    setBusy(true); setMsg(""); setLastError("");
    try {
      const customerId = effectiveCustomerId;
      const orderPayload = { tableId: effectiveTableId||undefined, customerId, type: orderType, items: cart.map(c=> ({ menuItemId:c.menuItemId, quantity:c.quantity, notes:c.notes, variantId:c.variantId, addOnIds:c.addOnIds })), discountAmount: discount, notes: notes + (orderType==="DELIVERY"? ` | Address: ${deliveryAddress}`:"") + (resolvedMode==="walkin"?" | WALKIN":"") };
      console.log("Creating order", orderPayload);
      const oRes = await fetch("/api/orders",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(orderPayload)});
      const oJson = await oRes.json().catch(()=>({}));
      if(!oRes.ok){ const m=`Order failed: ${oJson.error||oJson.message||oRes.statusText} (${oRes.status})`; setMsg(m); setLastError(m); console.error("Order API error", oJson); setBusy(false); return; }
      const orderId = oJson.id;
      setOrder({ id: orderId, orderNumber: oJson.orderNumber, totalAmount: oJson.totalAmount });
      const billPayload = { orderId, discountAmount: discount, couponCode: couponCode||undefined, loyaltyPointsToRedeem: loyaltyRedeem||undefined, payments: activePayments.map(p=> ({ method:p.method, amount: Number(p.amount), reference:p.reference })) };
      console.log("Creating bill", billPayload);
      const bRes = await fetch("/api/bills",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(billPayload)});
      const bJson = await bRes.json().catch(()=>({}));
      if(!bRes.ok){ const m=`Bill failed: ${bJson.error||bJson.message||bRes.statusText} (${bRes.status})${bJson.code?` [${bJson.code}]`:""}`; setMsg(m); setLastError(m); console.error("Bill API error", bJson); setBusy(false); return; }
      setBill(bJson);
      setPayments(activePayments);
      const earn = (bJson as unknown as {loyaltyEarned?:number}).loyaltyEarned || 0;
      const bal = (bJson as unknown as {loyaltyBalanceAfter?:number}).loyaltyBalanceAfter;
      if(earn) setMsg(`âœ… Paid â€¢ Bill ${bJson.billNumber} — customer ${customerMode==="found"? customerProfile?.name : effectiveCustomerProfile?.name || customerProfile?.name || "—"} â€¢ +${earn} pts (bal ${bal}) â€¢ QR ready — saved to CRM`);
      else setMsg(`âœ… Paid â€¢ Bill ${bJson.billNumber} — customer ${customerMode==="found"? customerProfile?.name : effectiveCustomerProfile?.name || customerProfile?.name || "—"} â€¢ QR ready — saved to CRM ${bJson.totalAmount <100 ? "(₹100+ to earn)" : ""}`);
      setTimeout(()=> document.getElementById("bill-success")?.scrollIntoView({behavior:"smooth", block:"start"}), 150);
      // persist for CRM refresh
      try{
        localStorage.setItem("crm_last_bill", JSON.stringify({ billNumber: bJson.billNumber, customerId: bJson.customerId || effectiveCustomerId || "", at: new Date().toISOString() }));
        localStorage.setItem("crm_refresh_needed", "1");
      }catch{}
      const phoneToRefresh = (effectiveCustomerProfile as unknown as {phone?:string})?.phone || resolvedCustomer?.phone || newCustomerForm.phone || customerPhone;
      if(phoneToRefresh){
        fetch(`/api/customers?phone=${encodeURIComponent(phoneToRefresh)}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }).then(r=>r.json()).then(j=>{ if(j.found && j.customer) setCustomerProfile(j.customer); }).catch(()=>null);
      }
      if(orderType==="DINE_IN" && tableId) {
        fetch("/api/tables", { cache: 'no-store' }).then(r=>r.json()).then(j=> Array.isArray(j)? setTables(j):null).catch(()=>null);
      }
      // haptic feedback
      try{ if(navigator.vibrate) navigator.vibrate(120); }catch{}
    } catch (e: unknown){ const m=e instanceof Error? e.message:"Network error"; setMsg(m); setLastError(m); console.error(e); }
    setBusy(false);
  }

  async function handleRazorpayPay(){
    if(cart.length===0){ setMsg("Add at least one item"); return; }
    // DINE_IN table will be auto-selected in createOrderAndBill, so don't block here — just warn
    if(grandTotal <=0){ setMsg("Cart total is 0 — add items"); return; }
    setRazorPayBusy(true); setMsg("Creating Razorpay orderâ€¦");
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
        setMsg(`Razorpay mock verified ₹${grandTotal} — creating billâ€¦`);
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
        description: `POS bill ₹${grandTotal} â€¢ ${cart.length} items`,
        order_id: j.orderId,
        handler: async (resp: { razorpay_order_id:string; razorpay_payment_id:string; razorpay_signature:string })=>{
          try{
            const vr = await fetch("/api/payments/razorpay/verify",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature, amount: grandTotal })});
            const vj = await vr.json();
            if(!vr.ok){ setMsg(vj.error||"Razorpay verify failed — payment not captured"); setRazorPayBusy(false); return; }
            setMsg(`Razorpay success ${resp.razorpay_payment_id} — creating billâ€¦`);
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

  const billingStep = bill ? 5 : cart.length===0 ? 1 : customerMode==="none" ? 3 : grandTotal>0 ? 4 : 2;
  return (
    <div className="space-y-5">
      {/* Header + Steps */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[22px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">POS & Billing</h1>
          <div className="flex items-center gap-2">
            <Badge className="border bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 px-2.5 py-1 text-xs font-medium">{orderType} â€¢ {cart.length} lines â€¢ ₹{grandTotal.toLocaleString("en-IN")}</Badge>
            {holdOrders.length>0 && <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-2.5 py-1 text-xs">{holdOrders.length} held</Badge>}
            {bill && <Badge className="bg-green-600 text-white border-green-600">âœ“ Paid</Badge>}
          </div>
        </div>
        {/* 5-step billing flow */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-auto pb-1">
          {[
            {n:1,label:"Products",active:billingStep>=1},
            {n:2,label:"Cart",active:billingStep>=2},
            {n:3,label:"Customer",active:billingStep>=3},
            {n:4,label:"Payment",active:billingStep>=4},
            {n:5,label:"Receipt",active:billingStep>=5},
          ].map(s=>(
            <div key={s.n} className="flex items-center gap-1.5 shrink-0">
              <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border ${s.active?"bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900":"bg-white text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700"}`}>{s.active && billingStep>s.n?"âœ“":s.n}</span>
              <span className={`text-xs font-medium whitespace-nowrap ${s.active?"text-zinc-900 dark:text-zinc-100":"text-zinc-500"}`}>{s.label}</span>
              {s.n<5 && <span className="w-6 sm:w-8 h-px bg-zinc-200 dark:bg-zinc-800 mx-1" />}
            </div>
          ))}
        </div>
        {(msg || lastError) && (
          <div className={`text-sm rounded-xl px-3 py-3 whitespace-pre-wrap border font-semibold shadow-sm flex items-start justify-between gap-3 ${msg.startsWith("âœ…") || lastError==="" ?"bg-green-50 border-green-300 text-green-800 dark:bg-green-950/40 dark:border-green-700 dark:text-green-200":"bg-red-50 border-red-300 text-red-800 dark:bg-red-950/40 dark:border-red-700 dark:text-red-200"}`}>
            <span className="flex-1">{msg || lastError}</span>
            <button onClick={()=>{ setMsg(""); setLastError(""); }} className="shrink-0 text-xs underline opacity-70 hover:opacity-100">Dismiss</button>
          </div>
        )}
        {busy && <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2"><span className="h-3 w-3 border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white rounded-full animate-spin" /> Processing — please waitâ€¦</div>}
      </div>

      {/* Category + OrderType */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl px-3 py-3 shadow-sm">
        <div className="flex gap-1.5 overflow-auto w-full lg:w-auto pb-1 lg:pb-0">
          {categories.map(c=> (
            <button key={c.id} onClick={()=> setActiveCategory(c.id)} className={`px-3.5 py-2 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${activeCategory===c.id?"bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 shadow-sm":"bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-white hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700"}`}>{c.name}</button>
          ))}
        </div>
        <div className="flex gap-1.5 shrink-0 w-full lg:w-auto">
          {(["DINE_IN","TAKEAWAY","DELIVERY"] as const).map(t=> <Button key={t} size="sm" variant={orderType===t?"default":"outline"} onClick={()=> setOrderType(t)} className="flex-1 lg:flex-none h-8 text-xs font-semibold">{t.replace("_","-")}</Button>)}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5 items-start">
        {/* CENTER: Menu - premium */}
        <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-[104px]">
          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3 border-b dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <CardTitle className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Menu — tap to add <span className="font-normal text-zinc-500 text-xs ml-1">({filteredMenu.length})</span></CardTitle>
                <div className="relative">
                  <Input placeholder="Search dishes..." value={search} onChange={e=>setSearch(e.target.value)} className="w-[200px] h-9 pl-9 bg-white dark:bg-zinc-800" />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400">âŒ•</span>
                </div>
              </div>
              <CardDescription className="flex flex-wrap gap-2 items-center pt-2">
                <select value={tableId} onChange={e=>setTableId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100" disabled={orderType!=="DINE_IN"}>
                  <option value="">Select table {orderType!=="DINE_IN"?"(not needed)":"*"}</option>
                  {tables.slice(0,40).map(t=><option key={t.id} value={t.id}>{t.number} — {t.status} â€¢ {t.capacity}pax</option>)}
                </select>
                {orderType==="DELIVERY" && <Input placeholder="Delivery address * (required)" value={deliveryAddress} onChange={e=>setDeliveryAddress(e.target.value)} className="h-9 min-w-[240px] flex-1 max-w-[320px]" />}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[68vh] overflow-auto pr-1">
                {filteredMenu.map(m=>(
                  <div key={m.id} className={`group border rounded-xl p-3.5 space-y-2.5 bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all ${m.isAvailable?"hover:border-zinc-300 dark:hover:border-zinc-700":"opacity-60"}`}>
                    <div className="h-20 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-800/50 flex items-center justify-center text-2xl overflow-hidden">
                      {m.imageUrl ? <img src={m.imageUrl} alt={m.name} className="h-full w-full object-cover" /> : <span className="text-zinc-400">ðŸ½ï¸</span>}
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm leading-tight text-zinc-900 dark:text-zinc-100 line-clamp-2">{m.name}</div>
                      <span className={`h-2.5 w-2.5 rounded-full mt-1 shrink-0 border-2 border-white dark:border-zinc-900 shadow-sm ${m.isVeg?"bg-green-600":"bg-red-600"}`} title={m.isVeg?"Veg":"Non-veg"} />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">₹{m.price}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">+{m.taxPercent}% â€¢ {m.isAvailable?<span className="text-green-600 dark:text-green-400 font-medium">Available</span>:<span className="text-red-500">Out</span>}</span>
                    </div>
                    {Boolean(m.variants?.length) && <select defaultValue="" onChange={e=>{ if(e.target.value) addToCart(m, e.target.value); e.target.value=""; }} className="w-full border rounded-lg h-8 text-xs px-2 bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"><option value="">Variantâ€¦</option>{m.variants!.map(v=><option key={v.id} value={v.id}>{v.name} (+₹{v.priceDelta})</option>)}</select>}
                    {Boolean(m.addOns?.length) && <div className="text-xs space-y-1">{m.addOns!.slice(0,2).map(a=> <label key={a.id} className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300"><input type="checkbox" className="rounded border-zinc-300 dark:border-zinc-600" onChange={e=>{ const checked=e.target.checked; if(checked) addToCart(m, undefined,[a.id]); }} /> {a.name} <span className="text-zinc-500">(+₹{a.price})</span></label>)}</div>}
                    <Button size="sm" className="w-full h-9 text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50" disabled={!m.isAvailable} onClick={()=> addToCart(m)}>+ Add</Button>
                  </div>
                ))}
                {filteredMenu.length===0 && <div className="col-span-3 text-center text-sm text-zinc-500 dark:text-zinc-400 py-10 border border-dashed dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-900">No items in this category — try another filter</div>}
              </div>
            </CardContent>
          </Card>
          {holdOrders.length>0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-amber-900 dark:text-amber-100">Held Orders — Resume</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {holdOrders.map(h=>(
                  <div key={h.id} className="flex items-center justify-between border rounded-lg p-3 text-sm bg-white dark:bg-zinc-900 dark:border-zinc-700">
                    <span className="text-zinc-700 dark:text-zinc-300">{h.orderType} â€¢ {h.cart.reduce((a,c)=>a+c.quantity,0)} items â€¢ {new Date(h.createdAt).toLocaleTimeString()} â€¢ Table {h.tableId? tables.find(t=>t.id===h.tableId)?.number||h.tableId.slice(0,6):"—"}</span>
                    <div className="flex gap-1"><Button size="sm" variant="outline" onClick={()=> resumeHold(h.id)} className="h-7">Resume</Button><Button size="sm" variant="ghost" onClick={()=> deleteHold(h.id)} className="h-7">Ã—</Button></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: Cart - step-by-step sticky */}
        <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-[104px] lg:max-h-[calc(100vh-112px)] lg:overflow-auto pr-1">
          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3 border-b dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <span className="h-6 w-6 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center text-xs font-bold">2</span>
                Cart â€¢ {cart.length? `${cart.reduce((a,c)=>a+c.quantity,0)} items`:"Empty"}
                {cart.length>0 && <Badge className="ml-auto bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-0">₹{grandTotal.toLocaleString("en-IN")}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {cart.length===0? <div className="text-sm text-zinc-500 dark:text-zinc-400 border-2 border-dashed dark:border-zinc-700 rounded-xl p-8 text-center bg-zinc-50 dark:bg-zinc-900/50">ðŸ›’ No items — tap menu to add<br/><span className="text-xs">Your cart is empty</span></div> :
                <div className="space-y-2 max-h-[32vh] overflow-auto pr-1">
                  {cart.map(c=>(
                    <div key={c.key} className="flex gap-3 items-start border rounded-xl p-3 bg-white dark:bg-zinc-900 dark:border-zinc-700 shadow-sm">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold leading-tight truncate text-zinc-900 dark:text-zinc-100">{c.name}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">₹{c.unitPrice} Ã— {c.quantity} = <span className="text-zinc-900 dark:text-zinc-100 font-bold">₹{c.unitPrice*c.quantity}</span></div>
                        <Input placeholder="Notes (no onion...)" value={c.notes||""} onChange={e=> setCart(prev=> prev.map(p=> p.key===c.key? {...p, notes:e.target.value}:p))} className="h-7 text-xs mt-2" />
                      </div>
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 rounded-full p-1 border dark:border-zinc-700"><Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full hover:bg-white dark:hover:bg-zinc-700" onClick={()=> updateQty(c.key,-1)}>âˆ’</Button><span className="text-sm w-7 text-center font-bold text-zinc-900 dark:text-zinc-100">{c.quantity}</span><Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full hover:bg-white dark:hover:bg-zinc-700" onClick={()=> updateQty(c.key,1)}>+</Button></div>
                        <button onClick={()=> removeLine(c.key)} className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              }
              <Textarea placeholder="Order notes (optional) — e.g. less spicy" value={notes} onChange={e=>setNotes(e.target.value)} rows={2} className="bg-white dark:bg-zinc-800" />

              {/* Step 3: Customer */}
              <div className="border rounded-xl p-4 space-y-3 bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700">
                <div className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  <span className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                  Customer & Loyalty {customerMode!=="none" && <button onClick={clearCustomer} className="ml-auto text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">Clear</button>}
                </div>
                {customerMode==="none" && (
                  <div className="space-y-2.5">
                    <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Mobile Number *</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input placeholder="10-digit mobile (6-9 start)" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} className="h-9 pl-9" />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400">ðŸ“±</span>
                      </div>
                      <Button size="sm" onClick={searchCustomer} disabled={customerSearching} className="h-9 px-4 font-semibold">{customerSearching?"Searchingâ€¦":"Search"}</Button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={()=>{ if(customerPhone) setNewCustomerForm(f=>({...f, phone:customerPhone})); setCustomerMode("new"); }} className="h-8 text-xs font-medium flex-1">+ New Customer</Button>
                      <Button size="sm" variant="ghost" onClick={continueAsWalkIn} className="h-8 text-xs flex-1">Walk-in</Button>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">ðŸ“· Scanner: <button onClick={()=> setCustomerPhone("9876543210")} className="underline text-blue-600 dark:text-blue-400">Demo scan</button></span>
                    </div>
                  </div>
                )}
                {customerMode==="found" && customerProfile && (
                  <div className="space-y-2.5 text-sm bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl p-3.5 shadow-sm">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{customerProfile.name} â€¢ {customerProfile.phone} {customerProfile.email?`â€¢ ${customerProfile.email}`:""}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-2 border dark:border-zinc-700">Visits: <b className="text-zinc-900 dark:text-zinc-100">{customerProfile.totalVisits ?? customerProfile.totalOrders}</b></span>
                      <span className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2 border border-green-200 dark:border-green-800">Spend: <b className="text-green-700 dark:text-green-300">₹{Math.round(customerProfile.totalSpending ?? customerProfile.totalSpend ?? 0)}</b></span>
                      <span className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-2 border border-orange-200 dark:border-orange-800">Points: <b className="text-orange-700 dark:text-orange-300">{customerProfile.loyaltyPoints ?? customerProfile.loyaltyAccount?.points ?? 0}</b></span>
                      <span className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-2 border dark:border-zinc-700">Last: <b>{customerProfile.lastVisitDate? new Date(customerProfile.lastVisitDate).toLocaleDateString():"—"}</b></span>
                    </div>
                    {Boolean(customerProfile.availableCoupons?.length) && (
                      <div className="text-xs">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">Available Coupons ({customerProfile.availableCoupons!.length})</div>
                        {customerProfile.availableCoupons!.slice(0,3).map(c=> <div key={c.code} className="font-mono border rounded-lg px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 mt-1.5 text-amber-900 dark:text-amber-100">{c.code} â€¢ {c.value}{c.rewardType==="PERCENTAGE"?"%":"₹"} off â€¢ exp {new Date(c.expiryDate).toLocaleDateString()}</div>)}
                      </div>
                    )}
                    <div className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-2.5 py-1.5">âœ“ Linked — Loyalty & coupons will apply</div>
                  </div>
                )}
                {customerMode==="new" && (
                  <div className="space-y-2.5 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl p-3.5 shadow-sm">
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">New Customer — fill & create</div>
                    <div><Label className="text-xs font-medium">Name *</Label><Input value={newCustomerForm.name} onChange={e=>setNewCustomerForm({...newCustomerForm, name:e.target.value})} placeholder="Full name" className="h-9 mt-1" /></div>
                    <div><Label className="text-xs font-medium">Mobile *</Label><Input value={newCustomerForm.phone} onChange={e=>setNewCustomerForm({...newCustomerForm, phone:e.target.value})} placeholder="9876543210" className="h-9 mt-1" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Email</Label><Input value={newCustomerForm.email} onChange={e=>setNewCustomerForm({...newCustomerForm, email:e.target.value})} placeholder="you@example.com" className="h-9 mt-1" /></div>
                      <div><Label className="text-xs">Birthday</Label><Input type="date" value={newCustomerForm.birthday} onChange={e=>setNewCustomerForm({...newCustomerForm, birthday:e.target.value})} className="h-9 mt-1" /></div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={createNewCustomer} disabled={customerSearching} className="h-8 font-semibold">Save & Link</Button>
                      <Button size="sm" variant="ghost" onClick={()=> setCustomerMode("none")} className="h-8">Back</Button>
                      <Button size="sm" variant="ghost" onClick={continueAsWalkIn} className="h-8">Walk-in</Button>
                    </div>
                  </div>
                )}
                {customerMode==="walkin" && (
                  <div className="text-sm bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl p-3.5">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">Walk-in customer</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">No loyalty/coupons/history. You can still bill & print.</div>
                    <Button size="sm" variant="outline" className="mt-3 h-8" onClick={()=> setCustomerMode("none")}>Change — search customer</Button>
                  </div>
                )}
                {customerMsg && <div className="text-xs bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg p-2.5 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{customerMsg}</div>}
              </div>

              {/* Step 4: Billing summary */}
              <div className="border rounded-xl p-4 space-y-2.5 text-sm bg-white dark:bg-zinc-900 dark:border-zinc-700 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100"><span className="h-6 w-6 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center text-xs font-bold">4</span>Billing Summary</div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400"><span>Subtotal</span><span className="font-medium text-zinc-900 dark:text-zinc-100">₹{subtotal.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400"><span>Tax 5% (server validated)</span><span className="font-medium">₹{tax}</span></div>
                  <div className="flex justify-between items-center gap-2"><span className="text-zinc-700 dark:text-zinc-300 font-medium">Manual Discount</span><Input type="number" value={discount} onChange={e=>setDiscount(Math.max(0, Number(e.target.value)||0))} className="w-24 h-8 text-right font-medium" /></div>
                  <div className="space-y-1.5 pt-2 border-t dark:border-zinc-700">
                    <div className="flex gap-2 items-center">
                      <Input placeholder="Coupon code (if any)" value={couponCode} onChange={e=>setCouponCode(e.target.value.toUpperCase())} className="h-8 font-mono text-xs flex-1" disabled={customerMode==="walkin"} />
                      <Button size="sm" variant="outline" onClick={applyCoupon} className="h-8 px-3 font-semibold">Apply</Button>
                      {couponDiscount>0 && <Button size="sm" variant="ghost" onClick={()=>{setCouponCode(""); setCouponDiscount(0); setCouponMsg("Coupon cleared");}} className="h-8 px-2">Clear</Button>}
                    </div>
                    {couponMsg && <div className="text-xs px-1 text-zinc-600 dark:text-zinc-400">{couponMsg}</div>}
                    {couponDiscount>0 && <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-950/30 rounded-lg px-2.5 py-1.5"><span>Coupon Discount</span><span>-₹{couponDiscount}</span></div>}
                  </div>
                  {customerMode==="found" && (customerProfile?.loyaltyPoints||0) > 0 && (
                    <div className="flex gap-2 items-center bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2.5">
                      <Input type="number" placeholder={`Redeem (avail ${customerProfile?.loyaltyPoints})`} value={loyaltyRedeem||""} onChange={e=>{
                        const v = Math.max(0, Number(e.target.value)||0);
                        const avail = customerProfile?.loyaltyPoints||0;
                        if(v>avail){ setMsg(`Cannot redeem ${v} — only ${avail} available`); return; }
                        setLoyaltyRedeem(v);
                      }} className="h-8 flex-1 bg-white dark:bg-zinc-800" />
                      <span className="text-xs font-medium text-orange-700 dark:text-orange-300 whitespace-nowrap">1 pt = ₹1</span>
                    </div>
                  )}
                  {loyaltyRedeem>0 && <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-950/30 rounded-lg px-2.5 py-1.5"><span>Loyalty Redeem</span><span>-₹{loyaltyRedeem}</span></div>}
                  <div className="flex justify-between font-bold text-[16px] border-t dark:border-zinc-700 pt-3 text-zinc-900 dark:text-zinc-100"><span>Grand Total</span><span>₹{grandTotal.toLocaleString("en-IN")}</span></div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">All totals recomputed server-side — client not trusted.</div>
                </div>
              </div>

              {/* Payments */}
              <div className="border rounded-xl p-4 space-y-3 bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-700">
                <div className="flex items-center justify-between"><span className="text-sm font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100"><span className="h-5 w-5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center text-[10px] font-bold">₹</span>Payments — Split allowed</span><Button size="sm" variant="outline" onClick={addPayment} className="h-7 text-xs font-semibold rounded-full">+ Split</Button></div>
                {payments.map((p,idx)=>(
                  <div key={idx} className="flex gap-2 items-center bg-white dark:bg-zinc-900 rounded-lg p-2 border dark:border-zinc-700">
                    <select value={p.method} onChange={e=> setPayment(idx,{ method: e.target.value as PaymentLine["method"]})} className="border rounded-lg h-8 text-xs px-2.5 font-medium bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 focus:outline-none"><option>CASH</option><option>CARD</option><option>UPI</option><option>WALLET</option><option>ONLINE</option></select>
                    <Input type="number" value={p.amount} onChange={e=> setPayment(idx,{ amount: Number(e.target.value)||0 })} className="h-8 text-right font-bold flex-1" placeholder="Amount" />
                    <Input placeholder="Ref" value={p.reference||""} onChange={e=> setPayment(idx,{ reference:e.target.value })} className="h-8 max-w-[90px] text-xs" />
                    {payments.length>1 && <Button variant="ghost" size="sm" onClick={()=> removePayment(idx)} className="h-8 w-8 p-0 text-zinc-500 hover:text-red-600">âœ•</Button>}
                  </div>
                ))}
                <div className="flex justify-between text-xs font-medium"><span className="text-zinc-600 dark:text-zinc-400">Paid ₹{paidSum.toLocaleString("en-IN")}</span><span className={remaining===0?"text-green-600 dark:text-green-400 font-bold":"text-amber-600 dark:text-amber-400"}>{remaining===0?"âœ“ Fully paid":`Remaining ₹${remaining.toLocaleString("en-IN")}`}</span></div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={holdOrder} disabled={cart.length===0} type="button" className="h-10 font-semibold rounded-xl">Hold Order</Button>
                  <Button onClick={()=>createOrderAndBill()} disabled={busy || razorPayBusy || cart.length===0} type="button" className="h-10 font-bold rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 disabled:opacity-50 shadow-sm">{busy?"Processingâ€¦":"Pay & Bill"}</Button>
                </div>
                <Button onClick={handleRazorpayPay} disabled={razorPayBusy || busy || cart.length===0} type="button" className="w-full h-11 bg-[#0a66c2] hover:bg-[#0958a8] dark:bg-[#0a66c2] text-white font-bold rounded-xl shadow-sm disabled:opacity-50" data-testid="razorpay-pay-btn">
                  {razorPayBusy?"Processingâ€¦":"Pay with Razorpay (UPI / Card / Wallet)"}
                </Button>
                <Button variant="ghost" className="w-full text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" onClick={()=>{ setCart([]); setDiscount(0); setCouponDiscount(0); setLoyaltyRedeem(0); setCouponCode(""); }}>Clear Cart</Button>
              </div>

              {/* Success */}
              {order && bill && (
                <div id="bill-success" className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 border-2 border-green-400 dark:border-green-700 p-4 space-y-3 shadow-sm">
                  <div className="flex items-start gap-2">
                    <span className="h-8 w-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0 mt-0.5">âœ“</span>
                    <div>
                      <div className="font-bold text-green-800 dark:text-green-200 text-[15px] leading-tight">Payment Successful — Bill {bill.billNumber}</div>
                      <div className="text-xs text-green-700 dark:text-green-300 mt-1">Order {order.orderNumber} â†’ Customer: {customerMode==="found"? customerProfile?.name : customerMode==="walkin"?"Walk-in":"—"} â€¢ Total ₹{bill.totalAmount.toLocaleString("en-IN")}</div>
                    </div>
                    <Badge className="ml-auto bg-green-600 text-white border-0 shrink-0">{bill.paymentStatus}</Badge>
                  </div>
                  <div className="flex gap-3 items-center bg-white dark:bg-zinc-900 rounded-xl p-3 border dark:border-zinc-700 shadow-sm">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(typeof window!=="undefined"? `${window.location.origin}/qr/${bill.qrToken}?billId=${bill.id}` : `/qr/${bill.qrToken}`)}`} alt="Loyalty QR" className="h-24 w-24 border rounded-xl bg-white p-1" />
                      <div className="text-xs space-y-1">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">Loyalty QR — Scan for reward</div>
                      <div className="break-all font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{bill.qrToken}</div>
                      <Link href={`/qr/${bill.qrToken}?billId=${bill.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">Open QR Reward Flow â†’</Link>
                      <div className="text-zinc-600 dark:text-zinc-400 font-medium text-xs">
                        {(bill as unknown as {loyaltyEarned?:number}).loyaltyEarned
                          ? `+${(bill as unknown as {loyaltyEarned?:number}).loyaltyEarned} pts earned (bal ${(bill as unknown as {loyaltyBalanceAfter?:number}).loyaltyBalanceAfter}) âœ“`
                          : bill.totalAmount>=100? `Earn ~${Math.floor(bill.totalAmount/100)*10} pts (₹100=10) — next bill` : "Spend ₹100+ to earn loyalty"}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" className="h-9 font-semibold rounded-xl" onClick={()=> document.getElementById("receipt")?.scrollIntoView({behavior:"smooth"})}>View & Print Bill</Button>
                    <Link href="/customers"><Button size="sm" variant="outline" className="w-full h-9 font-semibold rounded-xl dark:border-zinc-700">View in CRM â†’</Button></Link>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-9 font-semibold rounded-xl" onClick={()=>{ setCart([]); setOrder(null); setBill(null); setMsg("New bill started — add products"); window.scrollTo({top:0,behavior:"smooth"}); }}>+ New Bill</Button>
                    <Button size="sm" variant="ghost" className="flex-1 h-9" onClick={()=> { try{ localStorage.removeItem("crm_last_bill"); }catch{}; setOrder(null); setBill(null); }}>Dismiss</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {bill && (
            <Card id="receipt" className="shadow-lg border-zinc-300 dark:border-zinc-700 print:shadow-none overflow-hidden">
              <CardHeader className="bg-zinc-900 text-white dark:bg-zinc-800 border-b-0">
                <CardTitle className="text-[15px] flex items-center gap-2 text-white">ðŸ§¾ Print-ready Receipt <span className="text-xs bg-white text-zinc-900 px-2.5 py-1 rounded-full font-bold ml-auto">Bill #{bill.billNumber}</span></CardTitle>
                <CardDescription className="text-zinc-300 dark:text-zinc-400">Order #{order?.orderNumber || bill.orderId.slice(0,8)} â€¢ {new Date(bill.paidAt || Date.now()).toLocaleString()} â€¢ Table {tables.find(t=>t.id===tableId)?.number || "—"}</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                <div className="text-center border-b-2 border-dashed border-zinc-300 dark:border-zinc-700 pb-4">
                  <div className="font-black text-lg tracking-tight">SPICE GARDEN</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">MG Road, Pune â€¢ GST 27ABCDE1234F1Z5 â€¢ +91 98765 43210</div>
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Thank you for dining!</div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Bill No</span><span className="font-bold font-mono">{bill.billNumber}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Customer</span><span className="font-semibold">{customerMode==="found"? customerProfile?.name : "Walk-in"} {customerProfile?`â€¢ ${customerProfile.phone}`:""}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Status</span><span className="font-bold"><Badge className="bg-green-600 text-white border-0 text-[11px]">{bill.paymentStatus}</Badge></span></div>
                  <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Paid at</span><span className="font-medium">{bill.paidAt? new Date(bill.paidAt).toLocaleString():"—"}</span></div>
                </div>
                <div className="border-t-2 border-dashed border-zinc-200 dark:border-zinc-700 my-1" />
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-zinc-600 dark:text-zinc-400">Subtotal</span><span className="font-medium">₹{bill.subtotal.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-600 dark:text-zinc-400">Tax (5%)</span><span className="font-medium">₹{bill.taxAmount.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-600 dark:text-zinc-400">Discount</span><span className="font-medium">-₹{bill.discountAmount.toLocaleString("en-IN")}</span></div>
                  {(bill as unknown as {couponDiscount:number}).couponDiscount ? <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold"><span>Coupon</span><span>-₹{(bill as unknown as {couponDiscount:number}).couponDiscount}</span></div> : null}
                  {(bill as unknown as {loyaltyEarned?:number}).loyaltyEarned ? <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold"><span>Loyalty earned</span><span>+{(bill as unknown as {loyaltyEarned:number}).loyaltyEarned} pts</span></div> : null}
                  <div className="flex justify-between font-black text-[16px] border-t-2 border-zinc-900 dark:border-zinc-100 pt-3"><span>Total Paid</span><span>₹{bill.totalAmount.toLocaleString("en-IN")}</span></div>
                </div>
                <div className="border-2 border-dashed rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-600 flex gap-3 items-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${typeof window!=="undefined"? window.location.origin : "https://restroerp.vercel.app"}/qr/${bill.qrToken}?billId=${bill.id}`)}`}
                    alt="Review QR"
                    className="h-28 w-28 border rounded-xl bg-white p-1.5 shadow-sm"
                  />
                  <div className="text-xs space-y-1">
                    <div className="font-black text-zinc-900 dark:text-zinc-100">â­ Rate & Get Reward</div>
                    <div className="text-zinc-600 dark:text-zinc-400">Scan to review — 4â˜…=40% off, 5â˜…=50% off</div>
                    <div className="font-mono text-[10px] break-all text-zinc-500 dark:text-zinc-400">{bill.qrToken}</div>
                    <div className="text-zinc-400 text-[11px]">One reward per bill â€¢ 30 days valid</div>
                  </div>
                </div>
                <div className="flex gap-2 print:hidden">
                  <Button variant="outline" className="flex-1 h-10 font-bold rounded-xl dark:border-zinc-700" onClick={()=> window.print()}>ðŸ–¨ï¸ Print Receipt</Button>
                  <Button className="flex-1 h-10 font-bold rounded-xl bg-zinc-900 dark:bg-white dark:text-zinc-900" onClick={()=> window.open(`/qr/${bill.qrToken}?billId=${bill.id}`, "_blank")}>Open Review QR</Button>
                </div>
                <div className="flex gap-2 print:hidden">
                  <Button variant="outline" className="flex-1 h-9 font-semibold rounded-xl dark:border-zinc-700" onClick={async()=>{
                    const text = `Spice Garden\nBill ${bill.billNumber}\nTotal ₹${bill.totalAmount}\nQR: ${bill.qrToken}`;
                    if(navigator.share){ try{ await navigator.share({title: bill.billNumber, text}); }catch{} } else { await navigator.clipboard.writeText(text); alert("Receipt copied"); }
                  }}>Share Receipt</Button>
                  <Button variant="outline" className="flex-1 h-9 font-semibold rounded-xl dark:border-zinc-700" onClick={async()=>{ const b=bill; const blob=new Blob([`BILL ${b.billNumber}\nOrder ${order?.orderNumber}\nTotal ${b.totalAmount}\n`],{type:"text/plain"}); const url=URL.createObjectURL(blob); const a=document.createElement("a");a.href=url;a.download=`${b.billNumber}.txt`;a.click(); URL.revokeObjectURL(url); }}>Download</Button>
                </div>
                <div className="text-[10px] text-center text-zinc-400 dark:text-zinc-500 font-medium">Powered by RestroERP â€¢ GST inclusive â€¢ Visit again!</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

