"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Template = { id:string; name:string; content:string; variables:string[]; isActive:boolean };
type Campaign = { id:string; name:string; event:string; templateId:string; template?:Template; audience?:Record<string,unknown>; schedule:string; scheduledAt?:string; couponRequired:boolean; couponValue?:number; isActive:boolean; lastRunAt?:string };
type Log = { id:string; toPhone:string; message:string; status:string; event?:string; providerId?:string; createdAt:string };
type EventInfo = { event:string; name:string; content:string; variables:string[] };

export default function WhatsAppPage() {
  const [tab,setTab]=useState<"overview"|"templates"|"campaigns"|"consent"|"birthday"|"logs"|"send">("overview");
  const [templates,setTemplates]=useState<Template[]>([]);
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [logs,setLogs]=useState<Log[]>([]);
  const [events,setEvents]=useState<EventInfo[]>([]);
  const [msg,setMsg]=useState("");
  // send
  const [to,setTo]=useState("919876543210");
  const [message,setMessage]=useState("Hi {{name}}, your bill {{billNumber}} is paid. Review us: {{link}}");
  const [event,setEvent]=useState<string>("NEW_OFFER");
  const [sendRes,setSendRes]=useState("");
  // templates
  const [newTmpl,setNewTmpl]=useState({ name:"", content:"", variables:"" });
  // campaigns
  const [newCamp,setNewCamp]=useState({ name:"", event:"BIRTHDAY_OFFER" as string, templateId:"", couponRequired:false, couponValue:200 });
  // consent
  const [consentForm,setConsentForm]=useState({ customerId:"cust_1", whatsappOptIn:true, smsOptIn:false, emailOptIn:false, source:"whatsapp_page" });
  const [consentRes,setConsentRes]=useState("");
  // birthday
  const [bdayRes,setBdayRes]=useState("");

  async function load(){
    const [t,c,l,e]=await Promise.all([
      fetch("/api/whatsapp/templates", { cache: 'no-store' }).then(r=>r.json()).catch(()=>[]),
      fetch("/api/whatsapp/campaigns", { cache: 'no-store' }).then(r=>r.json()).catch(()=>[]),
      fetch("/api/whatsapp/logs?take=20", { cache: 'no-store' }).then(r=>r.json()).catch(()=>[]),
      fetch("/api/whatsapp/events", { cache: 'no-store' }).then(r=>r.json()).catch(()=>[]),
    ]);
    if(Array.isArray(t)) setTemplates(t);
    if(Array.isArray(c)) setCampaigns(c);
    if(Array.isArray(l)) setLogs(l);
    if(Array.isArray(e)) setEvents(e);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{ load(); },[]);
  useEffect(()=>{ const id=setInterval(load, 20000); return ()=>clearInterval(id); },[]);

  async function send(){
    const r=await fetch("/api/whatsapp/send",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ to, message, event, variables:{ name:"Test", coupon:"TEST100" } })});
    const j=await r.json();
    setSendRes(JSON.stringify(j,null,2));
    load();
  }
  async function createTemplate(){
    if(!newTmpl.name || !newTmpl.content){ setMsg("Name and content required"); return; }
    const vars=newTmpl.variables.split(",").map(s=>s.trim()).filter(Boolean);
    const r=await fetch("/api/whatsapp/templates",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ name:newTmpl.name, content:newTmpl.content, variables: vars })});
    if(r.ok){ setMsg("Template created"); setNewTmpl({ name:"", content:"", variables:"" }); load(); } else { const j=await r.json(); setMsg(j.error||"Failed"); }
  }
  async function createCampaign(){
    if(!newCamp.name || !newCamp.templateId){ setMsg("Name and template required"); return; }
    const r=await fetch("/api/whatsapp/campaigns",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(newCamp)});
    if(r.ok){ setMsg("Campaign created"); setNewCamp({ name:"", event:"BIRTHDAY_OFFER", templateId:"", couponRequired:false, couponValue:200 }); load(); } else { const j=await r.json(); setMsg(j.error||"Failed"); }
  }
  async function runCampaign(id:string){
    const r=await fetch(`/api/whatsapp/campaigns/${id}/run`,{ method:"POST"});
    const j=await r.json();
    setMsg(`Run ${id}: ${JSON.stringify(j)}`);
    load();
  }
  async function updateConsent(){
    const r=await fetch("/api/whatsapp/consent",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(consentForm)});
    const j=await r.json();
    if(r.ok) setConsentRes(`Updated ${j.id} — ${JSON.stringify(j)}`);
    else setConsentRes(j.error||"Failed");
  }
  async function runBirthday(){
    const r=await fetch("/api/whatsapp/birthday-run",{ method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({})});
    const j=await r.json();
    setBdayRes(JSON.stringify(j,null,2));
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">WhatsApp Automation & Engagement</h1>
        <Badge className="bg-green-600 text-white">Provider: mock (WHATSAPP_PROVIDER)</Badge>
      </div>
      {msg && <div className="text-sm bg-amber-50 border border-amber-200 rounded p-2">{msg}</div>}
      <div className="flex gap-2 border-b overflow-x-auto">
        {(["overview","templates","campaigns","consent","birthday","logs","send"] as const).map(t=> <button key={t} onClick={()=> setTab(t)} className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${tab===t? "border-zinc-900 text-zinc-900 dark:text-white":"border-transparent text-zinc-500"}`}>{t.toUpperCase()}</button>)}
      </div>

      {tab==="overview" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Provider Abstraction</CardTitle></CardHeader><CardContent className="text-xs text-zinc-600">Mock in dev (WHATSAPP_PROVIDER=mock). Set WHATSAPP_PROVIDER=meta + WHATSAPP_API_KEY + WHATSAPP_PHONE_NUMBER_ID for Meta Cloud API. No hardcoding.</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Events Supported</CardTitle></CardHeader><CardContent className="text-xs space-y-1">{events.slice(0,9).map(e=> <div key={e.event} className="flex justify-between"><span>{e.event}</span><Badge className="border bg-white text-xs">{e.variables.join(", ")}</Badge></div>)}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Consent Gating</CardTitle></CardHeader><CardContent className="text-xs text-zinc-600">Marketing events (WELCOME, COUPON_ISSUED, BIRTHDAY_OFFER, NEW_OFFER, FEEDBACK_REQUEST) require whatsappOptIn=true. Transactional (BILL_RECEIPT, ORDER_CONFIRMATION, DELIVERY_UPDATE) always allowed. Source + timestamp stored.</CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="text-base">Automation Service</CardTitle><CardDescription>campaign â†’ audience â†’ template â†’ schedule â†’ delivery log â€¢ Queued â†’ Sent â†’ Delivered â†’ Failed</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
              <div><div className="font-semibold">Campaigns {campaigns.length}</div><div className="text-xs text-zinc-500">{campaigns.map(c=> `${c.event} ${c.isActive?"âœ“":"âœ•"}`).join(" â€¢ ")}</div></div>
              <div><div className="font-semibold">Templates {templates.length}</div><div className="text-xs text-zinc-500">{templates.map(t=> t.name).join(", ")}</div></div>
              <div><div className="font-semibold">Logs {logs.length}</div><div className="text-xs text-zinc-500">{logs.filter(l=>l.status==="SENT").length} sent â€¢ {logs.filter(l=>l.status==="FAILED").length} failed</div></div>
              <div className="text-xs text-zinc-500">Schedule: IMMEDIATE/SCHEDULED/RECURRING_DAILY/WEEKLY â€¢ lastRunAt tracked</div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab==="templates" && (
        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Create Template — variables like {"{{name}}"} </CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
            <div><Label>Name (a-z0-9_)</Label><Input value={newTmpl.name} onChange={e=>setNewTmpl({...newTmpl, name:e.target.value})} placeholder="birthday_offer_v2" /></div>
            <div><Label>Variables (comma)</Label><Input value={newTmpl.variables} onChange={e=>setNewTmpl({...newTmpl, variables:e.target.value})} placeholder="name, coupon, expiry" /></div>
            <div className="md:col-span-2"><Label>Content</Label><Textarea value={newTmpl.content} onChange={e=>setNewTmpl({...newTmpl, content:e.target.value})} placeholder="Hi {{name}}! Happy Birthday {{coupon}}..." rows={3} /></div>
            <Button onClick={createTemplate} className="md:col-span-2">Create Template</Button>
          </CardContent></Card>
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map(t=> <Card key={t.id}><CardHeader className="pb-2"><CardTitle className="text-sm font-mono">{t.name}</CardTitle><CardDescription>{t.variables.join(", ")}</CardDescription></CardHeader><CardContent className="text-sm">{t.content}<div className="text-xs text-zinc-500 mt-1">Active: {String(t.isActive)}</div></CardContent></Card>)}
          </div>
        </div>
      )}

      {tab==="campaigns" && (
        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Create Campaign</CardTitle><CardDescription>audience + template + schedule + couponRequired</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
            <div><Label>Name</Label><Input value={newCamp.name} onChange={e=>setNewCamp({...newCamp, name:e.target.value})} placeholder="Birthday Daily 9am" /></div>
            <div><Label>Event</Label><select value={newCamp.event} onChange={e=>setNewCamp({...newCamp, event:e.target.value})} className="w-full border rounded h-9 px-3 text-sm">{events.map(e=> <option key={e.event} value={e.event}>{e.event}</option>)}</select></div>
            <div><Label>Template</Label><select value={newCamp.templateId} onChange={e=>setNewCamp({...newCamp, templateId:e.target.value})} className="w-full border rounded h-9 px-3 text-sm"><option value="">Select</option>{templates.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="flex gap-4 items-center"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newCamp.couponRequired} onChange={e=>setNewCamp({...newCamp, couponRequired:e.target.checked})} /> Coupon Required</label>{newCamp.couponRequired && <Input type="number" value={newCamp.couponValue||200} onChange={e=>setNewCamp({...newCamp, couponValue:Number(e.target.value)})} className="w-24" />}</div>
            <Button onClick={createCampaign} className="md:col-span-2">Create Campaign</Button>
          </CardContent></Card>
          <div className="grid gap-3 md:grid-cols-2">
            {campaigns.map(c=> <Card key={c.id}><CardHeader className="pb-2"><CardTitle className="text-sm">{c.name}</CardTitle><CardDescription>{c.event} â€¢ {c.schedule} â€¢ {c.isActive?"Active":"Inactive"} â€¢ Last {c.lastRunAt? new Date(c.lastRunAt).toLocaleString():"never"}</CardDescription></CardHeader><CardContent className="space-y-2 text-sm">
              <div>Audience: <span className="text-xs bg-zinc-100 rounded px-1">{JSON.stringify(c.audience||{})}</span></div>
              <div>Coupon: {c.couponRequired? `Yes ₹${c.couponValue}`:"No"}</div>
              <div className="flex gap-2"><Button size="sm" onClick={()=> runCampaign(c.id)}>Run Now</Button><Badge>{c.templateId}</Badge></div>
            </CardContent></Card>)}
          </div>
        </div>
      )}

      {tab==="consent" && (
        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Customer Consent</CardTitle><CardDescription>Store whatsappOptIn/smsOptIn/emailOptIn + timestamp + source. Never send marketing without consent.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
            <div><Label>Customer ID (e.g. cust_1)</Label><Input value={consentForm.customerId} onChange={e=>setConsentForm({...consentForm, customerId:e.target.value})} /></div>
            <div><Label>Source</Label><Input value={consentForm.source} onChange={e=>setConsentForm({...consentForm, source:e.target.value})} placeholder="qr_scan / pos / online_order" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={consentForm.whatsappOptIn} onChange={e=>setConsentForm({...consentForm, whatsappOptIn:e.target.checked})} /> WhatsApp Opt-in</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={consentForm.smsOptIn} onChange={e=>setConsentForm({...consentForm, smsOptIn:e.target.checked})} /> SMS Opt-in</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={consentForm.emailOptIn} onChange={e=>setConsentForm({...consentForm, emailOptIn:e.target.checked})} /> Email Opt-in</label>
            <Button onClick={updateConsent}>Save Consent</Button>
            {consentRes && <pre className="text-xs bg-zinc-100 p-3 rounded overflow-auto md:col-span-2">{consentRes}</pre>}
          </CardContent></Card>
          <Card><CardContent className="p-3 text-xs text-zinc-500">Try: cust_1 has birthday {new Date().getMonth()+1}/{new Date().getDate()}? Check via Customers page. Marketing consent gating enforced in automationService.hasRequiredConsent.</CardContent></Card>
        </div>
      )}

      {tab==="birthday" && (
        <div className="space-y-4">
          <Card><CardHeader><CardTitle>Birthday Automation — eligible today</CardTitle><CardDescription>Checks month/day, consent, generates personalized message + unique coupon if campaign requires, records Queuedâ†’Sentâ†’Delivered</CardDescription></CardHeader><CardContent className="space-y-3">
            <Button onClick={runBirthday}>Run Birthday Campaign Now (all active BIRTHDAY_OFFER)</Button>
            {bdayRes && <pre className="text-xs bg-zinc-100 p-3 rounded overflow-auto max-h-80">{bdayRes}</pre>}
            <div className="text-xs text-zinc-500">Mock: generates BDAY-XXXX coupons, logs to WhatsAppLog. In prod, cron at 09:00 daily calls POST /api/whatsapp/birthday-run.</div>
          </CardContent></Card>
        </div>
      )}

      {tab==="logs" && (
        <div className="space-y-3">
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={load}>Refresh</Button><span className="text-xs text-zinc-500 self-center">Statuses: Queued â†’ Sent â†’ Delivered â†’ Failed â€¢ {logs.length} shown</span></div>
          <div className="rounded border bg-white dark:bg-zinc-900 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800 text-xs"><tr><th className="p-2 text-left">To</th><th>Event</th><th>Status</th><th>Message</th><th>Time</th></tr></thead>
              <tbody>
                {logs.map(l=> <tr key={l.id} className="border-t"><td className="p-2 font-mono text-xs">{l.toPhone}</td><td className="p-2 text-xs">{l.event||"—"}</td><td className="p-2"><Badge className={l.status==="SENT"?"bg-green-100 text-green-800": l.status==="QUEUED"?"bg-amber-100": l.status==="FAILED"?"bg-red-100 text-red-800":"bg-zinc-100"}>{l.status}</Badge></td><td className="p-2 text-xs max-w-[300px] truncate">{l.message}</td><td className="p-2 text-xs">{new Date(l.createdAt).toLocaleString()}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==="send" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card><CardHeader><CardTitle>Manual Send (Mock)</CardTitle></CardHeader><CardContent className="space-y-3">
            <div><Label>To Phone</Label><Input value={to} onChange={e=>setTo(e.target.value)} /></div>
            <div><Label>Event (for consent & template)</Label><select value={event} onChange={e=>setEvent(e.target.value)} className="w-full border rounded h-9 px-3 text-sm">{events.map(ev=> <option key={ev.event} value={ev.event}>{ev.event}</option>)}</select></div>
            <div><Label>Message / will render template if event set</Label><Textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4} /></div>
            <Button onClick={send}>Send via Mock Adapter</Button>
            {sendRes && <pre className="text-xs bg-zinc-100 p-3 rounded overflow-auto max-h-40">{sendRes}</pre>}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Message Events</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
            {events.map(e=> <div key={e.event} className="border rounded p-2"><div className="font-mono text-xs font-bold">{e.event}</div><div className="text-xs">{e.content}</div><div className="text-xs text-zinc-500">vars: {e.variables.join(", ")}</div></div>)}
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}

