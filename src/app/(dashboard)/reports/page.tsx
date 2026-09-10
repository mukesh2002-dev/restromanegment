"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend,
} from "recharts";

type ReportsData = {
  dailySales:{date:string; total:number}[];
  monthlySales:{month:string; total:number}[];
  orders:number;
  avgOrderValue:number;
  topItems:{name:string; qty:number; revenue:number}[];
  tablePerf:{table:string; covers:number; revenue:number}[];
  payMethods:{method:string; count:number; amount:number}[];
  discountUsage:number;
  couponIssued:number;
  couponRedeemed:number;
  loyaltyPoints:number;
  customerVisits:number;
  newCustomers:number;
  repeatCustomers:number;
  reviews:number;
  ratingDist:{rating:number; count:number}[];
  avgRating:string;
  deliveryPerf:{total:number; delivered:number; pending:number; cancelled:number; avgTime:string};
  inventoryValue:number;
  lowStock:number;
  outOfStock:number;
  totalSales:number;
  crmSegments:{ newCustomer:number; repeatCustomer:number; highValue:number; inactive:number; birthdayThisMonth:number; couponHolder:number; loyaltyMember:number };
};

const COLORS=["#0ea5e9","#22c55e","#f59e0b","#ef4444","#8b5cf6"];

export default function ReportsPage(){
  const [from,setFrom]=useState("");
  const [to,setTo]=useState("");
  const [channel,setChannel]=useState("ALL");
  const [campaign,setCampaign]=useState("ALL");
  const [data,setData]=useState<ReportsData|null>(null);
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState("");

  async function load(){
    setLoading(true);
    const params=new URLSearchParams();
    if(from) params.set("from", from);
    if(to) params.set("to", to);
    if(channel) params.set("channel", channel);
    if(campaign) params.set("campaign", campaign);
    try{
      const r=await fetch(`/api/reports?${params.toString()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if(!r.ok){ setMsg("Failed to load — using demo fallback"); }
      const j=await r.json();
      if(j.error){ setMsg(j.error); } else setData(j);
    } catch{ setMsg("Error loading reports"); }
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{ load(); },[]);
  const d=data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Reports, CRM & Promotions</h1>
        <div className="flex gap-2 text-xs">
          <Link href="/rewards" className="underline">Promotions â†’ Rewards</Link>
          <Link href="/customers" className="underline">CRM â†’ Customers</Link>
        </div>
      </div>

      <Card><CardContent className="p-4 flex flex-wrap gap-3 items-end">
        <div><div className="text-xs font-medium">From</div><Input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="h-8" /></div>
        <div><div className="text-xs font-medium">To</div><Input type="date" value={to} onChange={e=>setTo(e.target.value)} className="h-8" /></div>
        <div><div className="text-xs font-medium">Channel</div><select value={channel} onChange={e=>setChannel(e.target.value)} className="border rounded h-8 px-2 text-sm"><option>ALL</option><option>DINE_IN</option><option>TAKEAWAY</option><option>DELIVERY</option><option>ONLINE</option></select></div>
        <div><div className="text-xs font-medium">Campaign</div><select value={campaign} onChange={e=>setCampaign(e.target.value)} className="border rounded h-8 px-2 text-sm"><option>ALL</option><option>4-star</option><option>5-star</option><option>BIRTHDAY_OFFER</option></select></div>
        <Button size="sm" onClick={load}>Apply Filters</Button>
        <Button size="sm" variant="outline" onClick={()=>{setFrom("");setTo("");setChannel("ALL");setCampaign("ALL"); setTimeout(load,100);}}>Clear</Button>
        {msg && <span className="text-xs text-amber-600">{msg}</span>}
      </CardContent></Card>

      {loading? <div className="text-sm text-zinc-500 p-8 text-center border rounded">Loading reportsâ€¦</div> : !d? <div className="text-sm text-red-600">No data</div> : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Sales</CardTitle></CardHeader><CardContent className="text-2xl font-bold">₹{d.totalSales.toLocaleString("en-IN")}<div className="text-xs font-normal text-zinc-500">{d.orders} orders • Avg ₹{d.avgOrderValue}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Customers</CardTitle></CardHeader><CardContent className="text-lg font-bold">{d.newCustomers} new • {d.repeatCustomers} repeat<div className="text-xs font-normal text-zinc-500">{d.customerVisits} visits</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Coupons</CardTitle></CardHeader><CardContent className="text-lg font-bold">{d.couponIssued} issued • {d.couponRedeemed} redeemed<div className="text-xs font-normal text-zinc-500">Discount ₹{d.discountUsage.toLocaleString("en-IN")} • Loyalty {d.loyaltyPoints} pts</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Reviews</CardTitle></CardHeader><CardContent className="text-lg font-bold">{d.reviews} reviews • {d.avgRating} â˜…<div className="text-xs font-normal text-zinc-500">{d.deliveryPerf.delivered}/{d.deliveryPerf.total} deliveries</div></CardContent></Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-base">Daily Sales (7d)</CardTitle><CardDescription>Filter by date/channel</CardDescription></CardHeader><CardContent className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.dailySales}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Bar dataKey="total" fill="#0ea5e9" /></BarChart></ResponsiveContainer></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Monthly Sales (6m)</CardTitle></CardHeader><CardContent className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={d.monthlySales}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} /></LineChart></ResponsiveContainer></CardContent></Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-base">Top-Selling Items</CardTitle></CardHeader><CardContent>
              <div className="h-[200px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.topItems} layout="vertical"><XAxis type="number"/><YAxis dataKey="name" type="category" width={100} tick={{fontSize:10}}/><Tooltip/><Bar dataKey="qty" fill="#f59e0b" /></BarChart></ResponsiveContainer></div>
              <div className="mt-2 space-y-1 text-sm">{d.topItems.map(t=> <div key={t.name} className="flex justify-between border-b py-1"><span>{t.name}</span><span>{t.qty} • ₹{t.revenue}</span></div>)}</div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Payment Methods</CardTitle></CardHeader><CardContent className="h-[260px] flex flex-col">
              <ResponsiveContainer width="100%" height={180}><PieChart><Pie data={d.payMethods} dataKey="amount" nameKey="method" cx="50%" cy="50%" outerRadius={70} label>{d.payMethods.map((entry,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer>
              <div className="space-y-1 text-xs">{d.payMethods.map(p=> <div key={p.method} className="flex justify-between"><span>{p.method} • {p.count} tx</span><span>₹{p.amount.toLocaleString("en-IN")}</span></div>)}</div>
            </CardContent></Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-base">Table Performance (top 10)</CardTitle></CardHeader><CardContent><table className="w-full text-sm"><thead className="text-xs text-zinc-500"><tr><th className="text-left">Table</th><th>Covers</th><th>Revenue</th></tr></thead><tbody>{d.tablePerf.map(t=> <tr key={t.table} className="border-t"><td>{t.table}</td><td className="text-center">{t.covers}</td><td className="text-right">₹{t.revenue}</td></tr>)}</tbody></table></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Rating Distribution</CardTitle><CardDescription>Avg {d.avgRating} â˜… • {d.reviews} reviews</CardDescription></CardHeader><CardContent className="h-[200px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.ratingDist}><XAxis dataKey="rating" /><YAxis/><Tooltip/><Bar dataKey="count" fill="#8b5cf6"/></BarChart></ResponsiveContainer></CardContent></Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardHeader><CardTitle className="text-base">Delivery Performance</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className="flex justify-between"><span>Total</span><span>{d.deliveryPerf.total}</span></div><div className="flex justify-between text-green-600"><span>Delivered</span><span>{d.deliveryPerf.delivered}</span></div><div className="flex justify-between text-amber-600"><span>Pending</span><span>{d.deliveryPerf.pending}</span></div><div className="flex justify-between text-red-600"><span>Cancelled</span><span>{d.deliveryPerf.cancelled}</span></div><div className="text-xs text-zinc-500">Avg time {d.deliveryPerf.avgTime}</div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Inventory Value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">₹{d.inventoryValue.toLocaleString("en-IN")}<div className="text-sm font-normal text-zinc-500">Low {d.lowStock} • Out {d.outOfStock} • <Link href="/inventory" className="underline">Inventory â†’</Link></div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Discount & Coupons</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><div className="flex justify-between"><span>Discount usage</span><span>₹{d.discountUsage}</span></div><div className="flex justify-between"><span>Issued</span><span>{d.couponIssued}</span></div><div className="flex justify-between"><span>Redeemed</span><span>{d.couponRedeemed}</span></div><div className="flex justify-between"><span>Loyalty pts</span><span>{d.loyaltyPoints}</span></div></CardContent></Card>
          </div>

          <Card><CardHeader><CardTitle className="text-base">CRM Segments</CardTitle><CardDescription>New / Repeat / High-value / Inactive / Birthday / Coupon holder / Loyalty</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-4 text-sm">
            <div className="border rounded p-3"><div className="font-bold text-lg">{d.crmSegments.newCustomer}</div><div className="text-xs text-zinc-500">New (30d)</div><Link href="/customers" className="text-xs underline">View</Link></div>
            <div className="border rounded p-3"><div className="font-bold text-lg">{d.crmSegments.repeatCustomer}</div><div className="text-xs text-zinc-500">Repeat (&gt;1 visit)</div></div>
            <div className="border rounded p-3"><div className="font-bold text-lg">{d.crmSegments.highValue}</div><div className="text-xs text-zinc-500">High-value (&gt;₹5000)</div></div>
            <div className="border rounded p-3"><div className="font-bold text-lg">{d.crmSegments.inactive}</div><div className="text-xs text-zinc-500">Inactive (90d)</div></div>
            <div className="border rounded p-3 bg-pink-50"><div className="font-bold text-lg">{d.crmSegments.birthdayThisMonth}</div><div className="text-xs text-zinc-500">Birthday this month</div><Link href="/whatsapp" className="text-xs underline">Send offer â†’</Link></div>
            <div className="border rounded p-3"><div className="font-bold text-lg">{d.crmSegments.couponHolder}</div><div className="text-xs text-zinc-500">Coupon holder (active)</div></div>
            <div className="border rounded p-3"><div className="font-bold text-lg">{d.crmSegments.loyaltyMember}</div><div className="text-xs text-zinc-500">Loyalty &gt;100 pts</div></div>
            <div className="border rounded p-3 bg-zinc-50"><div className="text-xs">Promotions config: Owner can set coupon campaigns, loyalty rules, birthday offers, min order, valid days, dates, usage limits, channels via <Link href="/rewards" className="underline">Rewards</Link> + <Link href="/whatsapp" className="underline">WhatsApp Campaigns</Link></div></div>
          </CardContent></Card>

          <Card className="border-blue-200 bg-blue-50/30"><CardHeader><CardTitle className="text-base flex items-center justify-between">Payments / Transactions <Link href="/reports/payments"><Badge className="bg-blue-600 hover:bg-blue-700 cursor-pointer">View â†’</Badge></Link></CardTitle><CardDescription>All restaurant payments — Cash / UPI / Card / Razorpay / Wallet / Split • Filter by date, method, status • Export CSV/Excel • Cashier Report</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="border rounded p-3 bg-white"><div className="font-semibold">Restaurant-wide</div><div className="text-xs text-zinc-500">Reports â†’ Payments / Transactions — all customers consolidated view</div><Link href="/reports/payments"><Button size="sm" className="mt-2">Open Payments Report â†’</Button></Link></div>
              <div className="border rounded p-3 bg-white"><div className="font-semibold">Customer-specific</div><div className="text-xs text-zinc-500">Customers / CRM â†’ Profile â†’ Payment History tab — per customer</div><Link href="/customers"><Button size="sm" variant="outline" className="mt-2">Open CRM â†’</Button></Link></div>
              <div className="border rounded p-3 bg-white"><div className="font-semibold">Payment Summary</div><div className="text-xs text-zinc-500">Daily: Cash ₹15k • UPI ₹12.5k • Card ₹8k • Razorpay ₹5.5k • Wallet ₹1k â†’ TOTAL ₹42k</div><div className="text-xs text-zinc-400 mt-2">Role: Owner full • Manager view • Cashier own tx</div></div>
            </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Promotions — Configuration (Owner)</CardTitle><CardDescription>Coupon campaigns • Loyalty rules • Birthday offers • Min order • Valid days • Dates • Usage limits • Channels</CardDescription></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
              <div className="border rounded p-3"><div className="font-semibold">Coupon Campaigns</div><div className="text-xs text-zinc-500">Configure in Rewards: minRating 4â˜…â†’40% 5â˜…â†’50% • minSpend • maxDiscount • start/end • usageLimit • eligible channels DINE_IN/DELIVERY</div><Link href="/rewards"><Badge>Manage â†’</Badge></Link></div>
              <div className="border rounded p-3"><div className="font-semibold">Loyalty Rules</div><div className="text-xs text-zinc-500">Earn 20pts / Redeem 50pts • expiry 30d • adjustment • linked bill • balanceAfter</div><Link href="/rewards"><Badge>Manage â†’</Badge></Link></div>
              <div className="border rounded p-3"><div className="font-semibold">Birthday Offers</div><div className="text-xs text-zinc-500">WhatsApp BIRTHDAY_OFFER campaign • coupon BDAY-XXXX • 7d expiry • consent gated • daily 09:00 cron</div><Link href="/whatsapp"><Badge>Automate â†’</Badge></Link></div>
              <div className="border rounded p-3"><div className="font-semibold">Delivery & Channels</div><div className="text-xs text-zinc-500">Eligible channels: DINE_IN/TAKEAWAY/DELIVERY/ONLINE • Delivery fee ₹40 • payment READY</div></div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

