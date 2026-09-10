"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type Period = { count: number; paidCount: number; amount: number; pendingAmount: number };
type Summary = {
  today: Period; week: Period; month: Period; total: Period;
  byMethod: { method: string; count: number; amount: number }[];
  source: string;
};

function methodLabel(m: string) {
  const map: Record<string, string> = { CASH: "Cash", UPI: "UPI", CARD: "Card", ONLINE: "Online", WALLET: "Wallet" };
  return map[m] || m;
}

export function PeriodSummary() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/reports/period-summary");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setData(j);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading) return <Card><CardContent className="p-6 text-center text-sm text-zinc-500">Loading aaj / week / month summary…</CardContent></Card>;
  if (error) return <Card><CardContent className="p-4 text-sm text-red-600">{error} <Button size="sm" variant="outline" onClick={load} className="ml-2">Retry</Button></CardContent></Card>;
  if (!data) return null;

  const cards = [
    { label: "Today", icon: "Today", p: data.today, desc: "Today total orders", color: "border-green-200 bg-green-50/50", href: "/reports/payments" },
    { label: "This Week", icon: "Week", p: data.week, desc: "Mon to today", color: "border-blue-200 bg-blue-50/50", href: "/reports/payments" },
    { label: "This Month", icon: "Month", p: data.month, desc: "1st to today", color: "border-orange-200 bg-orange-50/50", href: "/reports/payments" },
    { label: "Total (All Time)", icon: "Total", p: data.total, desc: "Total payment history", color: "border-zinc-200 bg-zinc-50", href: "/reports/payments" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Orders & Payment — Period Summary</h2>
        <div className="flex gap-2">
          <Badge className="text-[10px] border bg-white">{data.source === "demo" ? "Demo data" : "Live DB"}</Badge>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={load}>↻ Refresh</Button>
        </div>
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <Card key={c.label} className={`${c.color}`}>
            <CardHeader className="pb-2 p-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1">{c.icon} {c.label}</CardTitle>
              <CardDescription className="text-[11px]">{c.desc}</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-1">
              <div className="text-xl font-bold">{c.p.count} orders <span className="text-xs font-normal text-zinc-500">({c.p.paidCount} paid)</span></div>
              <div className="text-sm font-bold text-green-700">₹{c.p.amount.toLocaleString("en-IN")}</div>
              <div className="text-[11px] text-zinc-500">Pending ₹{c.p.pendingAmount.toLocaleString("en-IN")}</div>
              <Link href={c.href} className="text-xs underline text-blue-600">View details →</Link>
            </CardContent>
          </Card>
        ))}
      </div>
      {data.byMethod.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Payment History — Method wise (Total)</CardTitle><CardDescription>Cash / UPI / Card / Razorpay(ONLINE) / Wallet — total paid amount</CardDescription></CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-5 text-xs">
            {data.byMethod.map(m => (
              <div key={m.method} className="border rounded p-2 flex justify-between md:flex-col bg-white dark:bg-zinc-900">
                <span className="flex items-center gap-1 font-medium">{methodLabel(m.method)} <Badge className="ml-1 text-[10px] border bg-zinc-50">{m.count}</Badge></span>
                <span className="font-bold">₹{m.amount.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
