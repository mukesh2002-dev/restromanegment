"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function LoyaltyClaimPage(){
  const params = useParams();
  const token = params.token as string;
  const [step,setStep]=useState(1);
  const [qrInfo,setQrInfo]=useState<any>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [phone,setPhone]=useState("");
  const [otp,setOtp]=useState("");
  const [otpSent,setOtpSent]=useState(false);
  const [expectedOtp,setExpectedOtp]=useState("123456");
  const [customer,setCustomer]=useState<any>(null);
  const [card,setCard]=useState<any>(null);
  const [feedback,setFeedback]=useState({ food:5, service:5, cleanliness:5, overall:5, comment:"" });
  const [result,setResult]=useState<any>(null);

  async function loadQr(){
    try{
      const r=await fetch(`/api/loyalty/qr?token=${encodeURIComponent(token)}`, { cache:'no-store' });
      const j=await r.json();
      if(!r.ok) throw new Error(j.error||"QR invalid");
      setQrInfo(j);
    }catch(e:any){ setError(e.message); }
  }
  useEffect(()=>{ loadQr(); },[]);

  function normalizePhone(input: string){
    const digits = input.replace(/\D/g, "");
    if(digits.length===12 && digits.startsWith("91")) return digits.slice(2);
    if(digits.length===11 && digits.startsWith("0")) return digits.slice(1);
    return digits;
  }
  async function sendOtp(){
    const clean = normalizePhone(phone);
    if(!/^[6-9]\d{9}$/.test(clean)){ setError("Invalid Indian mobile — enter 10 digits starting 6-9 (e.g. 9876543210). Remove +91/0 prefix."); return; }
    setPhone(clean);
    setLoading(true);
    try{
      const otpCode = String(Math.floor(100000+Math.random()*900000));
      setExpectedOtp(otpCode);
      setOtpSent(true);
      setError("");
      alert(`Demo OTP: ${otpCode} (prod would send via SMS)`);
    }finally{ setLoading(false); }
  }
  async function verifyOtp(){
    if(otp !== expectedOtp){ setError("Invalid OTP"); return; }
    // Find or create customer
    const r=await fetch(`/api/customers?phone=${encodeURIComponent(phone)}`, { cache:'no-store' });
    const j=await r.json();
    if(j.found) setCustomer(j.customer);
    else {
      // Create new customer via loyalty
      setCustomer({ name:"New Customer", phone, isNew:true });
    }
    setStep(2);
    // Load card
    try{
      const rc=await fetch(`/api/loyalty/cards?phone=${encodeURIComponent(phone)}`, { cache:'no-store' });
      const jc=await rc.json();
      if(Array.isArray(jc) && jc.length) setCard(jc[0]);
    }catch{}
  }

  async function claimStamp(){
    setLoading(true); setError("");
    try{
      const r=await fetch(`/api/loyalty/stamp`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ orderId: qrInfo.qr.orderId, customerPhone: phone }) });
      const j=await r.json();
      if(!r.ok) throw new Error(j.error||"Claim failed");
      setResult(j);
      // Mark QR used
      await fetch(`/api/loyalty/qr`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ token, usedBy: phone }) }).catch(()=>null);
      setStep(3);
    }catch(e:any){ setError(e.message); }
    setLoading(false);
  }

  if(error && step===1) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md"><CardHeader><CardTitle>QR Error</CardTitle></CardHeader><CardContent><div className="text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div><a href="/" className="text-sm underline mt-3 inline-block">Go Home</a></CardContent></Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-2xl">🍽️</div>
          <CardTitle className="mt-2">ABC Restaurant — Loyalty</CardTitle>
          <CardDescription>Secure QR • {qrInfo?.qr?.secureToken?.slice(0,8) || token.slice(0,8)}… • Valid until {qrInfo?.qr?.expiresAt ? new Date(qrInfo.qr.expiresAt).toLocaleString() : "—"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step===1 && (
            <div className="space-y-3">
              <div className="text-center">
                <div className="font-bold">Welcome To Our Loyalty Program</div>
                {card && <div className="mt-3 p-3 border rounded-lg bg-white dark:bg-zinc-900 text-center">
                  <div className="font-mono text-sm">{"🎟️".repeat(card.currentStars)} {"☆".repeat(card.requiredStars - card.currentStars)}</div>
                  <div className="text-xs font-bold">{card.currentStars} / {card.requiredStars} Stamps {card.currentStars===4?"— Completed":""}</div>
                  <div className="text-xs text-zinc-500">Valid until {new Date(card.expiresAt).toLocaleDateString()} • 1 Month</div>
                </div>}
              </div>
              <div><Label>Mobile Number *</Label><div className="flex gap-2 mt-1"><span className="px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-900 text-sm">+91</span><Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="9876543210" className="flex-1" /></div></div>
              {!otpSent ? <Button onClick={sendOtp} disabled={loading} className="w-full">Send OTP</Button> : (
                <div className="space-y-2">
                  <Label>Enter OTP *</Label><Input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="123456" />
                  <Button onClick={verifyOtp} disabled={loading} className="w-full">Verify OTP</Button>
                  <div className="text-xs text-zinc-500">Demo OTP: {expectedOtp}</div>
                </div>
              )}
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
            </div>
          )}
          {step===2 && (
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                <div className="font-bold text-green-800 dark:text-green-200">✓ Mobile Verified</div>
                <div className="text-sm">{phone} {customer?.isNew ? "(New Customer)" : "Welcome Back!"}</div>
              </div>
              <div className="border rounded-lg p-3 bg-white dark:bg-zinc-900">
                <div className="font-semibold text-sm">How Was Your Experience?</div>
                {[
                  ["Food", "food"],
                  ["Service", "service"],
                  ["Cleanliness", "cleanliness"],
                  ["Overall", "overall"]
                ].map(([label,key])=>(
                  <div key={key} className="flex items-center justify-between mt-2">
                    <span className="text-sm">{label}</span>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n=>(
                        <button key={n} onClick={()=>setFeedback({...feedback, [key]:n})} className={`h-7 w-7 rounded-full border text-xs ${(feedback as any)[key] >= n ? "bg-amber-400 border-amber-500" : "bg-white dark:bg-zinc-800"}`}>★</button>
                      ))}
                    </div>
                  </div>
                ))}
                <Textarea value={feedback.comment} onChange={e=>setFeedback({...feedback, comment:e.target.value})} placeholder="Comments (optional)" rows={2} className="mt-3" />
              </div>
              <Button onClick={claimStamp} disabled={loading} className="w-full">{loading?"Adding Stamp...":"Submit Feedback & Earn Stamp"}</Button>
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
            </div>
          )}
          {step===3 && result && (
            <div className="text-center space-y-3">
              <div className="text-3xl">⭐</div>
              <div className="font-bold text-green-700 dark:text-green-300">Stamp Added!</div>
              <div className="border-2 border-dashed rounded-xl p-4 bg-amber-50 dark:bg-amber-950/20 text-center">
                <div className="flex justify-center gap-1 text-2xl">
                  {Array.from({length: result.card.requiredStars}).map((_,i)=>(
                    <span key={i} className={i < result.card.currentStars ? "text-amber-500" : "text-zinc-300 dark:text-zinc-600"}>🎟️</span>
                  ))}
                </div>
                <div className="font-mono text-sm font-bold mt-2">{result.card.currentStars} / {result.card.requiredStars} Stamps</div>
                <div className="text-xs font-medium mt-1">
                  {result.card.currentStars === 1 && result.card.requiredStars===4 && "1st Visit = 🎟️"}
                  {result.card.currentStars === 2 && result.card.requiredStars===4 && "2nd Visit = 🎟️🎟️"}
                  {result.card.currentStars === 3 && result.card.requiredStars===4 && "3rd Visit = 🎟️🎟️🎟️"}
                  {result.card.currentStars === 4 && result.card.requiredStars===4 && "4th Visit = 🎟️🎟️🎟️🎟️"}
                  {result.card.currentStars === 4 && "4 Visits = 4 Stamps 🎟️ — Completed"}
                </div>
                <div className="text-xs mt-1">
                  {result.card.currentStars < result.card.requiredStars
                    ? `Complete ${result.card.requiredStars - result.card.currentStars} More Visit (1 Month) To Get 🎁 40% OFF`
                    : `5th Visit = 40% OFF 🎁 — Reward Ready!`}
                </div>
                <div className="text-xs text-zinc-500 mt-1">Valid Until: {new Date(result.card.expiresAt).toLocaleDateString()} • 1 Month Loyalty Period</div>
              </div>
              {result.reward && (
                <div className="border-2 border-green-400 dark:border-green-600 rounded-xl p-3 bg-green-50 dark:bg-green-950/30">
                  <div className="font-bold text-green-800 dark:text-green-200">🎁 Reward Unlocked!</div>
                  <div className="font-mono text-lg font-black">{result.reward.couponCode}</div>
                  <div className="text-sm">{result.reward.discountPercentage}% OFF • Max ₹{result.reward.maximumDiscountAmount}</div>
                  <div className="text-xs">Valid until {new Date(result.reward.expiresAt).toLocaleDateString()}</div>
                </div>
              )}
              <div className="flex gap-2">
                <a href="/" className="flex-1"><Button variant="outline" className="w-full">Go Home</Button></a>
                <a href="/menu" className="flex-1"><Button className="w-full">Order Again</Button></a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
