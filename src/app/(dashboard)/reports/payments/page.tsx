"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PeriodSummary } from "@/components/dashboard/PeriodSummary";

type Row = {
  id: string;
  billNumber: string;
  orderNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  subtotal?: number;
  taxAmount?: number;
  paymentStatus: string;
  status: string;
  paidAt?: string | null;
  createdAt: string;
  payments: { method: string; amount: number; status: string; reference?: string | null }[];
  isSplit: boolean;
};

function methodLabel(m: string) {
  const map: Record<string, string> = { CASH: "Cash", UPI: "UPI", CARD: "Card", ONLINE: "Online", WALLET: "Wallet", SPLIT: "Split" };
  return map[m] || m;
}
function methodIcon(m: string) { return methodLabel(m); }
function statusBadge(s: string) {
  const cls: Record<string, string> = {
    PAID: "bg-green-100 text-green-800 border-green-200",
    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
    FAILED: "bg-red-100 text-red-800 border-red-200",
    REFUNDED: "bg-purple-100 text-purple-800 border-purple-200",
    PARTIAL: "bg-orange-100 text-orange-800 border-orange-200",
  };
  return cls[s] || "bg-zinc-100 text-zinc-700";
}

export default function PaymentsReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{ totalAmount: number; totalBills: number; byMethod: { method: string; count: number; amount: number }[] } | null>(null);
  const [page, setPage] = useState(1);
  const [take] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [method, setMethod] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [detail, setDetail] = useState<Row | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), take: String(take) });
      if (q) params.set("q", q);
      if (method !== "ALL") params.set("method", method);
      if (status !== "ALL") params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (minAmount) params.set("minAmount", minAmount);
      if (maxAmount) params.set("maxAmount", maxAmount);
      const r = await fetch(`/api/reports/payments?${params.toString()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setRows(j.data);
      setTotal(j.total);
      setSummary(j.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setLoading(false);
  }

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, method, status, from, to]);

  function exportCSV() {
    const header = ["Date", "Customer", "Order", "Payment ID", "Amount", "Method", "Status"];
    const lines = rows.map((r) => {
      const d = new Date(r.paidAt || r.createdAt).toLocaleString("en-IN");
      const m = r.isSplit ? "SPLIT" : r.payments[0]?.method || "—";
      return [d, r.customerName, r.orderNumber, r.billNumber, String(r.totalAmount), m, r.paymentStatus].map((v) => `"${v}"`).join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `payments-report.csv`; a.click(); URL.revokeObjectURL(url);
  }

  function exportExcel() { exportCSV(); } // simple

  function quickDate(range: string) {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (range === "today") { setFrom(fmt(now)); setTo(fmt(now)); }
    if (range === "yesterday") { const d = new Date(now); d.setDate(d.getDate() - 1); setFrom(fmt(d)); setTo(fmt(d)); }
    if (range === "7days") { const d = new Date(now); d.setDate(d.getDate() - 7); setFrom(fmt(d)); setTo(fmt(now)); }
    if (range === "30days") { const d = new Date(now); d.setDate(d.getDate() - 30); setFrom(fmt(d)); setTo(fmt(now)); }
    if (range === "thisMonth") { const d = new Date(now.getFullYear(), now.getMonth(), 1); setFrom(fmt(d)); setTo(fmt(now)); }
    if (range === "clear") { setFrom(""); setTo(""); }
  }

  const totalPages = Math.max(1, Math.ceil(total / take));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Payments / Transactions</h1>
        <div className="flex gap-2 text-xs">
          <Link href="/reports" className="underline">â† Reports</Link>
          <Link href="/dashboard" className="underline">Dashboard â†’</Link>
          <Link href="/customers" className="underline">CRM â†’ Customers</Link>
        </div>
      </div>

      {/* Period Summary — Aaj / Week / Month / Total */}
      <PeriodSummary />

      {/* Filtered Summary */}
      {summary && (
        <div className="grid gap-3 md:grid-cols-4">
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-zinc-500">Total Bills</CardTitle></CardHeader><CardContent className="text-xl font-bold">{summary.totalBills}</CardContent></Card>
          <Card className="bg-green-50 border-green-200"><CardHeader className="pb-1"><CardTitle className="text-xs text-green-700">Total Amount</CardTitle></CardHeader><CardContent className="text-xl font-bold text-green-700">₹{summary.totalAmount.toLocaleString("en-IN")}</CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs">By Method</CardTitle></CardHeader><CardContent className="space-y-1 text-xs">{summary.byMethod.map((m) => <div key={m.method} className="flex justify-between"><span>{methodLabel(m.method)} • {m.count}</span><span>₹{m.amount.toLocaleString("en-IN")}</span></div>)}</CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs">Today&apos;s Summary</CardTitle></CardHeader><CardContent className="space-y-1 text-xs">
            {summary.byMethod.map((m) => <div key={m.method} className="flex justify-between"><span>{m.method}</span><span>₹{m.amount.toLocaleString("en-IN")}</span></div>)}
            <div className="border-t pt-1 flex justify-between font-bold"><span>TOTAL</span><span>₹{summary.totalAmount.toLocaleString("en-IN")}</span></div>
          </CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Search & Filters</CardTitle><CardDescription>Search by Customer Name / Mobile / Order Number / Payment ID / Razorpay ID</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]"><div className="text-xs font-medium mb-1">Search</div><Input placeholder="Customer / Order / Payment ID" value={q} onChange={(e) => setQ(e.target.value)} className="h-8" /></div>
            <div><div className="text-xs font-medium mb-1">Method</div><select value={method} onChange={(e) => setMethod(e.target.value)} className="border rounded h-8 px-2 text-sm bg-white dark:bg-zinc-900"><option value="ALL">All</option><option>CASH</option><option>UPI</option><option>CARD</option><option>ONLINE</option><option>WALLET</option></select></div>
            <div><div className="text-xs font-medium mb-1">Status</div><select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded h-8 px-2 text-sm bg-white dark:bg-zinc-900"><option value="ALL">All</option><option>PAID</option><option>PENDING</option><option>FAILED</option><option>REFUNDED</option><option>PARTIAL</option></select></div>
            <Button size="sm" onClick={exportCSV} variant="outline" className="h-8">Export CSV</Button>
            <Button size="sm" onClick={exportExcel} variant="outline" className="h-8">Export Excel</Button>
            <Button size="sm" onClick={() => window.print()} variant="outline" className="h-8">Print</Button>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div><div className="text-xs font-medium mb-1">From</div><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8" /></div>
            <div><div className="text-xs font-medium mb-1">To</div><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8" /></div>
            <div><div className="text-xs font-medium mb-1">Min ₹</div><Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" className="h-8 w-24" /></div>
            <div><div className="text-xs font-medium mb-1">Max ₹</div><Input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="—" className="h-8 w-24" /></div>
            <Button size="sm" variant="outline" onClick={() => { setQ(""); setMethod("ALL"); setStatus("ALL"); setFrom(""); setTo(""); setMinAmount(""); setMaxAmount(""); setPage(1); }} className="h-8">Reset</Button>
            <Button size="sm" onClick={load} className="h-8">Apply Filter</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              ["today", "Today"],
              ["yesterday", "Yesterday"],
              ["7days", "Last 7 Days"],
              ["30days", "Last 30 Days"],
              ["thisMonth", "This Month"],
              ["clear", "Clear"],
            ].map(([k, label]) => (
              <button key={k} onClick={() => quickDate(k)} className="text-xs border rounded-full px-2 py-1 hover:bg-zinc-50">{label}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          {loading ? <div className="p-6 text-center text-sm text-zinc-500">Loading transactions…</div> : error ? <div className="p-6 text-center text-sm text-red-600">{error}</div> : rows.length === 0 ? <div className="p-8 text-center text-sm text-zinc-500 border border-dashed m-4 rounded">No transactions — try different filters.</div> : (
            <>
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 text-xs"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Customer</th><th className="p-2 text-left">Order</th><th className="p-2 text-right">Amount</th><th className="p-2 text-left">Method</th><th className="p-2 text-left">Status</th><th className="p-2 text-center">Action</th></tr></thead>
                  <tbody>
                    {rows.map((r) => {
                      const m = r.isSplit ? "SPLIT" : r.payments[0]?.method || "—";
                      return (
                        <tr key={r.id} className="border-t hover:bg-zinc-50 dark:hover:bg-zinc-800">
                          <td className="p-2 text-xs whitespace-nowrap">{new Date(r.paidAt || r.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                          <td className="p-2"><div className="font-medium text-xs">{r.customerName}</div><div className="text-[11px] text-zinc-500">{r.customerPhone}</div></td>
                          <td className="p-2 font-mono text-xs">{r.orderNumber}<div className="text-[11px] text-zinc-500">{r.billNumber}</div></td>
                          <td className="p-2 text-right font-bold">₹{r.totalAmount.toLocaleString("en-IN")}</td>
                          <td className="p-2 text-xs flex items-center gap-1">{methodIcon(m)} {m}</td>
                          <td className="p-2"><Badge className={`border text-[11px] ${statusBadge(r.paymentStatus)}`}>{r.paymentStatus}</Badge></td>
                          <td className="p-2 text-center"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDetail(r)}>View</Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden p-3 space-y-2">
                {rows.map((r) => (
                  <div key={r.id} className="border rounded p-3 bg-white dark:bg-zinc-900 space-y-1">
                    <div className="flex justify-between"><span className="font-bold text-sm">{r.customerName} • ₹{r.totalAmount}</span><Badge className={`border text-[11px] ${statusBadge(r.paymentStatus)}`}>{r.paymentStatus}</Badge></div>
                    <div className="text-xs text-zinc-500">{new Date(r.paidAt || r.createdAt).toLocaleString("en-IN")} • {r.orderNumber}</div>
                    <div className="flex justify-between items-center"><span className="text-xs">{methodIcon(r.isSplit ? "SPLIT" : r.payments[0]?.method || "")} {r.isSplit ? "Split" : r.payments[0]?.method}</span><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDetail(r)}>View</Button></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {total > take && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs text-zinc-500">{total} total • Page {page}/{Math.max(1, Math.ceil(total / take))}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= Math.ceil(total / take)} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setDetail(null)}>
          <Card className="w-full max-w-lg max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader><CardTitle className="text-base">Payment Details</CardTitle><CardDescription>{detail.billNumber} • {detail.orderNumber}</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-zinc-500">Customer</span><span className="font-medium">{detail.customerName} • {detail.customerPhone}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Date</span><span>{new Date(detail.paidAt || detail.createdAt).toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Payment ID</span><span className="font-mono">{detail.id.slice(0, 12)}</span></div>
              </div>
              <div className="border-t pt-2 space-y-1 text-xs">
                <div className="flex justify-between font-bold text-base"><span>Total Paid</span><span>₹{detail.totalAmount.toLocaleString("en-IN")}</span></div>
                {detail.payments.map((p, i) => (
                  <div key={i} className="flex justify-between border rounded p-2 bg-zinc-50 dark:bg-zinc-800"><span>{methodIcon(p.method)} {p.method} {p.reference ? <span className="font-mono text-[11px] text-zinc-500">{p.reference.slice(0, 14)}</span> : null}</span><span className="font-bold">₹{p.amount.toLocaleString("en-IN")}</span></div>
                ))}
                {detail.isSplit && <div className="text-xs text-green-700">Split Payment — {detail.payments.length} parts</div>}
                {detail.payments[0]?.method === "ONLINE" && !detail.isSplit && (
                  <div className="border rounded p-2 bg-blue-50/50 text-xs space-y-1">
                    <div className="font-medium">Razorpay</div>
                    <div className="flex justify-between"><span className="text-zinc-500">Payment ID</span><span className="font-mono">{detail.payments[0].reference || "—"}</span></div>
                    <div className="text-[11px] text-zinc-500">Secret key not exposed.</div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => window.print()}>Print Receipt</Button>
                <Button size="sm" className="flex-1" onClick={() => setDetail(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

