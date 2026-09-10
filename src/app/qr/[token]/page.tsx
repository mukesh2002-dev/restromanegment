"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useParams, useSearchParams } from "next/navigation";

type BillInfo = { id:string; billNumber:string; totalAmount:number; paymentStatus:string; paidAt?:string; qrToken?:string; status?:string };

export default function QRPage() {
  const params = useParams();
  const sp = useSearchParams();
  const tokenParam = params.token as string;
  const billIdFromUrl = sp.get("billId") || "";

  const [step,setStep]=useState(1);
  const [billId,setBillId]=useState(billIdFromUrl || tokenParam);
  const [billInfo,setBillInfo]=useState<BillInfo|null>(null);
  const [billError,setBillError]=useState("");
  const [verifying,setVerifying]=useState(false);
  const [form, setForm] = useState({ name:"", phone:"", email:"", birthday:"", rating:5, comment:"Excellent service and taste!" });
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<{ ok:boolean; msg:string; coupon?:{code:string; value:number; expiryDate:string}; }|null>(null);
  const [loading, setLoading] = useState(false);

  async function verifyBill(){
    if(!billId.trim()){ setBillError("Enter Bill ID / Number"); return; }
    setVerifying(true); setBillError("");
    try{
      const r=await fetch(`/api/bills/verify?billId=${encodeURIComponent(billId)}&qrToken=${encodeURIComponent(tokenParam)}`);
      const j=await r.json();
      if(!r.ok){ setBillError(j.error||"Not found — try bill_0001 (demo) or a fresh POS bill"); setVerifying(false); return; }
      // j.bill may have billNumber etc
      const b=j.bill as BillInfo;
      if(b.paymentStatus!=="PAID") { setBillError(`Bill ${b.billNumber} not PAID (${b.paymentStatus}) — cannot claim`); setVerifying(false); return; }
      if(j.alreadyClaimed) { setBillError(`Already claimed for this bill — one reward per bill`); setVerifying(false); return; }
      setBillInfo(b);
      setStep(2);
    } catch{ setBillError("Verify failed"); }
    setVerifying(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(()=>{ if(billIdFromUrl) verifyBill(); },[]);

  async function submit() {
    if(!form.name.trim() || !form.phone.trim()){ setResult({ ok:false, msg:"Name and 10-digit mobile required" }); return; }
    if(!/^[6-9]\d{9}$/.test(form.phone)){ setResult({ ok:false, msg:"Invalid Indian mobile — must start 6-9 and 10 digits" }); return; }
    setLoading(true); setResult(null);
    const res = await fetch("/api/rewards/claim", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({
      billId: billInfo?.id || billId,
      qrToken: tokenParam,
      customer: { name: form.name, phone: form.phone, email: form.email, birthday: form.birthday },
      rating: form.rating,
      comment: form.comment,
    })});
    const j = await res.json();
    setLoading(false);
    if (!res.ok) {
      if(j.code==="NOT_ELIGIBLE") setResult({ ok:false, msg:`Feedback saved — rating ${form.rating} ★ is below reward threshold (4 ★+). Thank you!` });
      else if(j.code==="ALREADY_CLAIMED") setResult({ ok:false, msg:"ALREADY_CLAIMED — this bill already earned a reward. No additional coupon created." });
      else if(j.code==="EXPIRED_TOKEN") setResult({ ok:false, msg:"QR expired — bill older than 30 days (anti-abuse)" });
      else if(j.code==="RATE_LIMITED") setResult({ ok:false, msg:`Rate limited — try after ${j.retryAfter||5}s` });
      else setResult({ ok:false, msg:`Error ${j.code||""}: ${j.error || JSON.stringify(j)}` });
    } else {
      if(j.coupon) setResult({ ok:true, msg:`Reward unlocked!`, coupon: j.coupon });
      else if(j.loyaltyTx) setResult({ ok:true, msg:`Points awarded: ${j.loyaltyTx.points}` });
      else setResult({ ok:true, msg: j.message || "Reward claimed" });
      setStep(5);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 gap-3">
      {/* Home button - top */}
      <div className="w-full max-w-lg flex justify-between items-center">
        <a href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          <span>←</span> Home
        </a>
        <a href="/dashboard" className="text-xs text-zinc-500 hover:underline dark:text-zinc-400">Dashboard →</a>
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Spice Garden — Rate & Win</CardTitle>
          <CardDescription>Step {step}/4 • Bill: {billInfo?.billNumber || billId} • Token {tokenParam.slice(0,12)}… • Secure server validation</CardDescription>
          <div className="flex gap-1 pt-2">{[1,2,3,4].map(s=> <div key={s} className={`h-1 flex-1 rounded ${step>=s?"bg-zinc-900 dark:bg-white":"bg-zinc-200"}`} />)}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step===1 && (
            <div className="space-y-3">
              <div><Label>Bill ID / Number* (or scan QR)</Label><Input value={billId} onChange={e=>setBillId(e.target.value)} placeholder="bill_0001 or BILL-2026-00001" /></div>
              <Button onClick={verifyBill} disabled={verifying} className="w-full">{verifying?"Verifying…":"Verify Bill & Continue"}</Button>
              {billError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{billError}</div>}
              <div className="text-xs text-zinc-500">We validate: bill exists • paymentStatus PAID • not already claimed • QR token matches • not expired (30d). Do not trust QR payload alone.</div>
              <div className="text-xs bg-zinc-50 border rounded p-2">Try: bill_0001 (PAID) • bill_0010 (PENDING fail) • bill_0002 with cra_ token — then re-scan same bill to see ALREADY_CLAIMED.</div>
            </div>
          )}
          {step===2 && billInfo && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                <div className="font-bold text-green-800">✓ Bill verified: {billInfo.billNumber}</div>
                <div>Total ₹{billInfo.totalAmount} • {billInfo.paymentStatus} • Paid {billInfo.paidAt? new Date(billInfo.paidAt).toLocaleDateString():"—"}</div>
                <Badge className="bg-green-600 text-white mt-1">Eligible for reward check</Badge>
              </div>
              <div>
                <Label>Rating*</Label>
                <div className="flex gap-2 mt-1">
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} onClick={()=>setForm({...form, rating:n})} className={`h-10 w-10 rounded-full border text-lg ${form.rating>=n ? "bg-amber-400 border-amber-500" : "bg-white"}`}>{n}★</button>
                  ))}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{form.rating>=4?`Eligible — campaign threshold ${form.rating} ★ → reward`:"Feedback only (1–3 ★ no reward, per policy)"}</div>
              </div>
              <div><Label>Feedback</Label><Textarea value={form.comment} onChange={e=>setForm({...form, comment:e.target.value})} rows={3} placeholder="How was your experience?" /></div>
              <div className="flex gap-2"><Button variant="outline" onClick={()=> setStep(1)}>Back</Button><Button onClick={()=> setStep(3)} className="flex-1">Next: Your details →</Button></div>
            </div>
          )}
          {step===3 && (
            <div className="space-y-3">
              <div><Label>Name*</Label><Input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="Your name" /></div>
              <div><Label>Mobile* (10 digits, 6-9 start)</Label><Input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} placeholder="9876543210" /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e=>setForm({...form, email:e.target.value})} placeholder="you@example.com" /></div>
              <div><Label>Birthday (month-day for offers)</Label><Input type="date" value={form.birthday} onChange={e=>setForm({...form, birthday:e.target.value})} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} /> Consent to marketing communications</label>
              <div className="flex gap-2"><Button variant="outline" onClick={()=> setStep(2)}>Back</Button><Button onClick={()=> setStep(4)} className="flex-1">Next: Confirm →</Button></div>
            </div>
          )}
          {step===4 && (
            <div className="space-y-3">
              <div className="border rounded p-3 text-sm space-y-1 bg-white dark:bg-zinc-900">
                <div><b>Bill:</b> {billInfo?.billNumber} • ₹{billInfo?.totalAmount}</div>
                <div><b>Rating:</b> {form.rating} ★ — {form.comment||"—"}</div>
                <div><b>Name:</b> {form.name||"—"} • {form.phone} {form.email?`• ${form.email}`:""}</div>
                <div><b>Birthday:</b> {form.birthday||"—"} • Consent: {consent?"Yes":"No"}</div>
              </div>
              <Button onClick={submit} disabled={loading} className="w-full">{loading?"Submitting…":"Submit & Unlock Reward"}</Button>
              {result && <div className={`rounded border p-3 text-sm ${result.ok?"bg-green-50 border-green-200 text-green-800":"bg-red-50 border-red-200 text-red-700"}`}>{result.msg} {result.coupon && <div className="font-mono font-bold mt-1">Coupon: {result.coupon.code} • {result.coupon.value}% • exp {new Date(result.coupon.expiryDate).toLocaleDateString()}</div>}</div>}
              <Button variant="ghost" onClick={()=> setStep(3)}>Back</Button>
            </div>
          )}
          {step===5 && result?.ok && (
            <div className="text-center space-y-3">
              <div className="text-4xl">🎉</div>
              <div className="font-bold text-lg text-green-700 dark:text-green-300">Thank you, {form.name}!</div>
              <div className="text-sm text-zinc-700 dark:text-zinc-300">{result.msg} — 50% off coupon ready!</div>
              {result.coupon && (
                <div className="border-2 border-dashed border-green-400 dark:border-green-600 rounded-xl p-4 bg-green-50 dark:bg-green-950/30 shadow-sm">
                  <div className="font-mono text-xl font-black tracking-wider text-green-800 dark:text-green-200 select-all">{result.coupon.code}</div>
                  <div className="text-sm font-bold text-green-700 dark:text-green-300 mt-1">{result.coupon.value}% off • valid until {new Date(result.coupon.expiryDate).toLocaleDateString("en-IN")}</div>
                  <div className="text-[11px] text-green-600 dark:text-green-400 mt-1">Auto-copied to clipboard — paste at POS billing</div>
                  <div className="flex gap-2 mt-3 justify-center">
                    <Button size="sm" variant="outline" className="h-8 font-semibold" onClick={async()=>{ try{ await navigator.clipboard.writeText(result.coupon!.code); alert("Coupon copied: "+result.coupon!.code);}catch{} }}>Copy Code</Button>
                    <Button size="sm" className="h-8 font-bold" onClick={()=> window.open(`/order?coupon=${encodeURIComponent(result.coupon!.code)}`, "_blank")}>Order Again & Apply →</Button>
                  </div>
                </div>
              )}
              <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-lg p-2.5">Coupon linked to bill {billInfo?.billNumber} • one per bill • share only with phone {form.phone}<br/>Next step: Show this code at counter / enter in POS → Coupon code → Apply → 50% off</div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-9" onClick={()=> window.print()}>Print Coupon</Button>
                <Button variant="ghost" className="flex-1 h-9" onClick={()=> setStep(1)}>Rate Another Bill</Button>
              </div>
              <a href="/" className="w-full inline-flex justify-center items-center gap-1.5 text-sm font-semibold text-white bg-zinc-900 hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 rounded-md h-10 mt-1">
                ⌂ Go to Home
              </a>
            </div>
          )}
          {result && !result.ok && step>=4 && <div className="text-xs text-zinc-500 pt-2">Anti-abuse: duplicate scans → ALREADY_CLAIMED, IP logged, rate-limited, expired QR rejected.</div>}
          {/* Home option on all steps */}
          <div className="pt-3 border-t dark:border-zinc-800 mt-1 flex gap-2">
            <a href="/" className="flex-1 inline-flex justify-center items-center gap-1.5 text-xs font-medium border rounded-md h-9 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300">⌂ Home</a>
            <a href="/order" className="flex-1 inline-flex justify-center items-center gap-1.5 text-xs font-medium border rounded-md h-9 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300">Order Online</a>
          </div>
        </CardContent>
      </Card>
      <a href="/" className="text-xs text-zinc-500 hover:underline dark:text-zinc-400">← Back to Home</a>
    </div>
  );
}
