"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { PeriodSummary } from "@/components/dashboard/PeriodSummary";
import { ShoppingCart, Clock, CheckCircle, AlertTriangle, Flame, Truck, Users, Star, Package, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type KOT = { id:string; kotNumber:string; status:string; priority:number; table:string; createdAt:string };
type Order = { id:string; orderNumber:string; totalAmount:number; status:string; createdAt:string; customer?:{name:string}|null };

export default function DashboardPage() {
  const [kots, setKots] = useState<KOT[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async()=>{
    setLoading(true);
    try{
      const [rKot, rOrder, rRep] = await Promise.all([
        fetch('/api/kots', { cache:'no-store', headers:{'Cache-Control':'no-cache'}}).then(r=>r.json()).catch(()=>[]),
        fetch('/api/orders?limit=6', { cache:'no-store'}).then(r=>r.json()).catch(()=>[]),
        fetch('/api/reports', { cache:'no-store'}).then(r=>r.json()).catch(()=>null),
      ]);
      setKots(Array.isArray(rKot)?rKot:[]);
      setOrders(Array.isArray(rOrder)?rOrder: (rOrder?.data||[]));
      setReports(rRep);
    } finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    const onVis=()=>{ if(document.visibilityState==='visible') load(); };
    const onFocus=()=> load();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return ()=>{ window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVis); };
  },[load]);

  const pendingKOTs = kots?.filter(k=>["NEW","ACCEPTED","PREPARING"].includes(k.status)).length ?? 0;
  const todayOrders = reports?.orders ?? orders?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Welcome back — here&apos;s what&apos;s happening today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="hidden sm:inline-flex border bg-white dark:bg-zinc-900">{new Date().toLocaleDateString("en-IN", { dateStyle:"long"})}</Badge>
          <Link href="/pos"><Button size="sm" className="h-8">+ New Order</Button></Link>
          <Link href="/kot"><Button size="sm" variant="outline" className="h-8">Kitchen →</Button></Link>
        </div>
      </div>

      {/* Period Summary */}
      <PeriodSummary />

      {/* Key metrics - premium */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-sm transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><ShoppingCart className="h-3.5 w-3.5"/> Today&apos;s Orders</CardTitle><TrendingUp className="h-3.5 w-3.5 text-blue-500"/></CardHeader>
            <CardContent><div className="text-2xl font-bold">{reports?.orders ?? todayOrders}</div><div className="text-xs text-zinc-500">Avg {formatCurrency(reports?.avgOrderValue||0)} • {reports?.totalSales? formatCurrency(reports.totalSales):''}</div></CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500 hover:shadow-sm transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5"/> Pending</CardTitle><Badge className="bg-amber-100 text-amber-800 text-[10px]">{pendingKOTs} KOT</Badge></CardHeader>
            <CardContent><div className="text-2xl font-bold">{pendingKOTs}</div><div className="text-xs text-zinc-500">Kitchen queue • {reports?.deliveryPerf?.pending ?? 0} delivery pending</div></CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 hover:shadow-sm transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5"/> Completed</CardTitle><Badge className="bg-green-100 text-green-800 text-[10px]">Paid</Badge></CardHeader>
            <CardContent><div className="text-2xl font-bold">{reports?.reviews ?? 0} <span className="text-sm font-normal text-zinc-500">reviews • {reports?.avgRating ?? 0}★</span></div><div className="text-xs text-zinc-500">{formatCurrency(reports?.totalSales||0)} revenue</div></CardContent>
          </Card>
          <Card className={`border-l-4 hover:shadow-sm transition-shadow ${ (reports?.lowStock||0)>5 ? "border-l-red-500 bg-red-50/50 dark:bg-red-950/10":"border-l-zinc-300"}`}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Package className="h-3.5 w-3.5"/> Alerts</CardTitle><AlertTriangle className={`h-3.5 w-3.5 ${(reports?.lowStock||0)>0?"text-amber-500":"text-zinc-400"}`} /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{reports?.lowStock ?? 0}<span className="text-sm font-normal text-zinc-500"> low • {reports?.outOfStock ?? 0} out</span></div><div className="text-xs text-zinc-500">Inventory • <Link href="/inventory" className="underline">Restock →</Link></div></CardContent>
          </Card>
        </div>
      )}

      {/* Two columns: Recent Orders + Kitchen */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between"><div><CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="h-4 w-4"/> Recent Orders</CardTitle><CardDescription>Latest 6 orders • auto-refresh</CardDescription></div><Link href="/reports/payments" className="text-xs underline">View all →</Link></CardHeader>
          <CardContent className="p-0">
            {loading ? <div className="p-4 space-y-2"><Skeleton className="h-10"/><Skeleton className="h-10"/><Skeleton className="h-10"/></div> : !orders?.length ? <div className="p-8 text-center text-sm text-zinc-500">No orders yet — place via POS</div> : (
              <div className="divide-y">
                {orders.slice(0,6).map(o=>(
                  <div key={o.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <div><div className="font-mono text-xs font-semibold">{o.orderNumber}</div><div className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleTimeString()} • {o.customer?.name || 'Walk-in'}</div></div>
                    <div className="text-right"><div className="text-sm font-bold">{formatCurrency(o.totalAmount)}</div><Badge className={`text-[10px] ${o.status==="COMPLETED"?"bg-green-100 text-green-800":o.status==="CANCELLED"?"bg-red-100 text-red-700":"bg-amber-100 text-amber-800"}`}>{o.status}</Badge></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between"><div><CardTitle className="text-sm flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500"/> Kitchen Status</CardTitle><CardDescription>{pendingKOTs} pending • {kots?.length ?? 0} total</CardDescription></div><Link href="/kot" className="text-xs underline">KDS →</Link></CardHeader>
          <CardContent>
            {loading ? <div className="space-y-2"><Skeleton className="h-12"/><Skeleton className="h-12"/></div> : !kots?.length ? <div className="p-4 text-center text-sm text-zinc-500">No KOTs — POS order will auto-create</div> : (
              <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
                {kots.slice(0,6).map(k=>(
                  <div key={k.id} className="flex items-center justify-between border rounded-lg px-3 py-2 bg-white dark:bg-zinc-900">
                    <div><div className="font-mono text-xs font-bold">{k.kotNumber}</div><div className="text-xs text-zinc-500">{k.table} • {k.status}</div></div>
                    <Badge className={`${k.status==="NEW"?"bg-zinc-900 text-white":k.status==="PREPARING"?"bg-amber-500 text-white":"bg-green-600 text-white"} text-[10px]`}>{k.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      {reports ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4"/> Sales Trend (7 days)</CardTitle></CardHeader>
            <CardContent className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={reports.dailySales}><XAxis dataKey="date" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Bar dataKey="total" fill="#0ea5e9" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Order Status Breakdown</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1">
              <div className="flex justify-between border-b py-1.5"><span>NEW / PREPARING</span><span className="font-bold">{pendingKOTs}</span></div>
              <div className="flex justify-between border-b py-1.5"><span>DELIVERED</span><span className="font-bold">{reports.deliveryPerf?.delivered ?? 0}</span></div>
              <div className="flex justify-between border-b py-1.5"><span>PENDING delivery</span><span className="font-bold">{reports.deliveryPerf?.pending ?? 0}</span></div>
              <div className="flex justify-between border-b py-1.5"><span>Total Sales</span><span className="font-bold">{formatCurrency(reports.totalSales||0)}</span></div>
              <div className="pt-3 flex gap-2"><Link href="/delivery"><Badge>Delivery →</Badge></Link><Link href="/kot"><Badge>KDS →</Badge></Link><Link href="/reports"><Badge>Reports →</Badge></Link></div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2"><CardSkeleton/><CardSkeleton/></div>
      )}

      {/* Bottom alerts */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-sm transition-shadow"><CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1.5"><Users className="h-3.5 w-3.5"/> Customers</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{reports?.newCustomers ?? 0} new <span className="text-sm font-normal text-zinc-500">• {reports?.repeatCustomers ?? 0} repeat</span></div><Link href="/customers" className="text-xs underline">CRM →</Link></CardContent></Card>
        <Card className="hover:shadow-sm transition-shadow"><CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1.5"><Star className="h-3.5 w-3.5"/> Reviews</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{reports?.reviews ?? 0} <span className="text-sm font-normal">★ {reports?.avgRating ?? 0}</span></div><Link href="/reviews" className="text-xs underline">Reviews →</Link></CardContent></Card>
        <Card className="hover:shadow-sm transition-shadow"><CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1.5"><Truck className="h-3.5 w-3.5"/> Delivery</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{reports?.deliveryPerf?.total ?? 0}<span className="text-sm font-normal text-zinc-500"> • {reports?.deliveryPerf?.delivered ?? 0} delivered</span></div><Link href="/delivery" className="text-xs underline">Delivery →</Link></CardContent></Card>
      </div>
    </div>
  );
}
