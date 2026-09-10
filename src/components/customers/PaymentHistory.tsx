"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type PaymentLine = { method: string; amount: number; status: string; reference?: string | null };
type PaymentRow = {
  id: string;
  billNumber: string;
  orderNumber: string;
  orderId: string;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  paymentStatus: string;
  status: string;
  paidAt?: string | null;
  createdAt: string;
  qrToken?: string | null;
  payments: PaymentLine[];
  isSplit: boolean;
};

type Summary = {
  totalOrders: number;
  totalPaid: number;
  refundAmount: number;
  lastPayment: number;
  lastPaymentAt?: string | null;
};

function methodIcon(m: string) {
  const map: Record<string, string> = { CASH: "💵", UPI: "📱", CARD: "💳", ONLINE: "🟦", WALLET: "👛", SPLIT: "🔀" };
  return map[m] || "💰";
}
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

export function PaymentHistory({ customerId, customerName, customerPhone }: { customerId: string; customerName?: string; customerPhone?: string }) {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [take] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [method, setMethod] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [detail, setDetail] = useState<PaymentRow | null>(null);

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
      const r = await fetch(`/api/customers/${customerId}/payments?${params.toString()}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load");
      let filtered = j.data as PaymentRow[];
      // client-side amount filter
      if (minAmount) filtered = filtered.filter((x) => x.totalAmount >= Number(minAmount));
      if (maxAmount) filtered = filtered.filter((x) => x.totalAmount <= Number(maxAmount));
      setRows(filtered);
      setSummary(j.summary);
      setTotal(j.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, page]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, method, status, from, to]);

  function exportCSV() {
    const header = ["Date", "Order No", "Payment ID", "Amount", "Method", "Status"];
    const lines = rows.map((r) => {
      const d = new Date(r.paidAt || r.createdAt).toLocaleString("en-IN");
      const m = r.isSplit ? "SPLIT" : r.payments[0]?.method || "—";
      return [d, r.orderNumber, r.id.slice(0, 8), String(r.totalAmount), m, r.paymentStatus].map((v) => `"${v}"`).join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-history-${customerId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
          <Card className="border-zinc-200"><CardHeader className="pb-1 p-3"><CardTitle className="text-xs text-zinc-500">Total Orders</CardTitle></CardHeader><CardContent className="p-3 pt-0 text-xl font-bold">{summary.totalOrders}</CardContent></Card>
          <Card className="border-green-200 bg-green-50/50"><CardHeader className="pb-1 p-3"><CardTitle className="text-xs text-green-700">Total Paid</CardTitle></CardHeader><CardContent className="p-3 pt-0 text-xl font-bold text-green-700">₹{summary.totalPaid.toLocaleString("en-IN")}</CardContent></Card>
          <Card className="border-purple-200 bg-purple-50/50"><CardHeader className="pb-1 p-3"><CardTitle className="text-xs text-purple-700">Refund Amount</CardTitle></CardHeader><CardContent className="p-3 pt-0 text-xl font-bold text-purple-700">₹{summary.refundAmount.toLocaleString("en-IN")}</CardContent></Card>
          <Card className="border-orange-200 bg-orange-50/50"><CardHeader className="pb-1 p-3"><CardTitle className="text-xs text-orange-700">Last Payment</CardTitle></CardHeader><CardContent className="p-3 pt-0 text-xl font-bold">₹{summary.lastPayment.toLocaleString("en-IN")}<div className="text-[11px] font-normal text-zinc-500">{summary.lastPaymentAt ? new Date(summary.lastPaymentAt).toLocaleDateString("en-IN") : "—"}</div></CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[180px]"><div className="text-xs font-medium mb-1">Search</div><Input placeholder="Order No / Payment ID / Razorpay ID" value={q} onChange={(e) => setQ(e.target.value)} className="h-8" /></div>
            <div><div className="text-xs font-medium mb-1">Method</div><select value={method} onChange={(e) => setMethod(e.target.value)} className="border rounded h-8 px-2 text-sm bg-white dark:bg-zinc-900"><option value="ALL">All</option><option>CASH</option><option>UPI</option><option>CARD</option><option>ONLINE</option><option>WALLET</option><option>SPLIT</option></select></div>
            <div><div className="text-xs font-medium mb-1">Status</div><select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded h-8 px-2 text-sm bg-white dark:bg-zinc-900"><option value="ALL">All</option><option>PAID</option><option>PENDING</option><option>FAILED</option><option>REFUNDED</option><option>PARTIAL</option></select></div>
            <Button size="sm" variant="outline" onClick={exportCSV} className="h-8">Export CSV</Button>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div><div className="text-xs font-medium mb-1">From</div><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8" /></div>
            <div><div className="text-xs font-medium mb-1">To</div><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8" /></div>
            <div><div className="text-xs font-medium mb-1">Min ₹</div><Input type="number" placeholder="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="h-8 w-24" /></div>
            <div><div className="text-xs font-medium mb-1">Max ₹</div><Input type="number" placeholder="No limit" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="h-8 w-24" /></div>
            <Button size="sm" variant="outline" onClick={() => { setQ(""); setMethod("ALL"); setStatus("ALL"); setFrom(""); setTo(""); setMinAmount(""); setMaxAmount(""); setPage(1); }} className="h-8">Reset</Button>
            <Button size="sm" onClick={load} className="h-8">Apply</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {["today", "yesterday", "7days", "30days", "thisMonth", "clear"].map((k) => (
              <button key={k} onClick={() => quickDate(k)} className="text-xs border rounded-full px-2 py-1 hover:bg-zinc-50 capitalize">{k === "clear" ? "Clear" : k.replace("days", " Days")}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          {loading ? <div className="p-6 text-center text-sm text-zinc-500">Loading payment history…</div> : error ? <div className="p-6 text-center text-sm text-red-600">{error}</div> : rows.length === 0 ? <div className="p-8 text-center text-sm text-zinc-500 border border-dashed m-4 rounded">No payments found — try different filters or create a bill via POS.</div> : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-600 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Date & Time</th>
                      <th className="p-2 text-left">Order No.</th>
                      <th className="p-2 text-left">Payment ID</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-left">Method</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const methodLabel = r.isSplit ? "SPLIT" : r.payments[0]?.method || "—";
                      return (
                        <tr key={r.id} className="border-t hover:bg-zinc-50 dark:hover:bg-zinc-800">
                          <td className="p-2 text-xs whitespace-nowrap">{new Date(r.paidAt || r.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                          <td className="p-2 font-mono text-xs">{r.orderNumber}</td>
                          <td className="p-2 font-mono text-xs">{r.billNumber}<div className="text-[11px] text-zinc-500">{r.id.slice(0, 8)}</div></td>
                          <td className="p-2 text-right font-bold">₹{r.totalAmount.toLocaleString("en-IN")}</td>
                          <td className="p-2"><span className="flex items-center gap-1 text-xs">{methodIcon(methodLabel)} {methodLabel} {r.payments[0]?.reference ? <span className="text-[10px] text-zinc-500 truncate max-w-[80px]">{r.payments[0].reference.slice(0, 12)}</span> : null}</span></td>
                          <td className="p-2"><Badge className={`border text-[11px] ${statusBadge(r.paymentStatus)}`}>{r.paymentStatus}</Badge></td>
                          <td className="p-2 text-center"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDetail(r)}>View</Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden p-3 space-y-2">
                {rows.map((r) => (
                  <div key={r.id} className="border rounded p-3 bg-white dark:bg-zinc-900 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="font-mono text-sm font-bold">{r.orderNumber} • ₹{r.totalAmount}</div>
                      <Badge className={`border text-[11px] ${statusBadge(r.paymentStatus)}`}>{r.paymentStatus}</Badge>
                    </div>
                    <div className="text-xs text-zinc-500">{new Date(r.paidAt || r.createdAt).toLocaleString("en-IN")} • {r.billNumber}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs flex items-center gap-1">{methodIcon(r.isSplit ? "SPLIT" : r.payments[0]?.method || "")} {r.isSplit ? "Split Payment" : r.payments[0]?.method} {r.payments.length > 1 ? `(${r.payments.length} parts)` : ""}</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDetail(r)}>View</Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > take && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs text-zinc-500">{total} total • Page {page}/{totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setDetail(null)}>
          <Card className="w-full max-w-lg max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payment Details</CardTitle>
              <div className="text-xs text-zinc-500">{detail.billNumber} • Order {detail.orderNumber}</div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-zinc-500">Customer</span><span className="font-medium">{customerName || "—"} • {customerPhone || "—"}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Date & Time</span><span>{new Date(detail.paidAt || detail.createdAt).toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Payment ID</span><span className="font-mono">{detail.id.slice(0, 12)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Order No</span><span className="font-mono">{detail.orderNumber}</span></div>
              </div>

              <div className="border-t pt-3 space-y-1 text-xs">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{detail.subtotal?.toLocaleString("en-IN") || "—"}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>₹{detail.taxAmount?.toLocaleString("en-IN") || "—"}</span></div>
                {detail.discountAmount ? <div className="flex justify-between"><span>Discount</span><span>-₹{detail.discountAmount}</span></div> : null}
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total Paid</span><span>₹{detail.totalAmount.toLocaleString("en-IN")}</span></div>
              </div>

              <div className="space-y-2">
                <div className="font-medium text-xs">Payment Method{detail.payments.length > 1 ? "s (Split)" : ""}</div>
                {detail.payments.map((p, i) => (
                  <div key={i} className="flex justify-between items-center border rounded p-2 bg-zinc-50 dark:bg-zinc-800">
                    <span className="flex items-center gap-2 text-xs">{methodIcon(p.method)} {p.method} {p.reference ? <span className="font-mono text-[11px] text-zinc-500">{p.reference.slice(0, 16)}</span> : null}</span>
                    <span className="font-bold">₹{p.amount.toLocaleString("en-IN")}</span>
                  </div>
                ))}
                {detail.isSplit && <div className="text-xs text-green-700">✓ Split Payment • Fully Paid</div>}
                {!detail.isSplit && detail.payments[0]?.method === "ONLINE" && (
                  <div className="border rounded p-2 bg-blue-50/50 text-xs space-y-1">
                    <div className="font-medium">Razorpay Details</div>
                    <div className="flex justify-between"><span className="text-zinc-500">Gateway</span><span>Razorpay</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Payment ID</span><span className="font-mono">{detail.payments[0].reference || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Status</span><span>Captured</span></div>
                    <div className="text-[11px] text-zinc-500">Secret key never exposed — only transaction info shown.</div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Badge className={`border ${statusBadge(detail.paymentStatus)}`}>{detail.paymentStatus}</Badge>
                  <span className="text-xs text-zinc-500">{detail.isSplit ? "Split Payment" : detail.payments[0]?.method} • {detail.paymentStatus}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(detail.id); alert("Payment ID copied"); }}>Copy ID</Button>
                <Button size="sm" className="flex-1" onClick={() => window.print()}>Print Receipt</Button>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setDetail(null)}>Close</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
