import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats } from "@/data/demo";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const s = getDashboardStats();
  const items = [
    { label:"Today's Sales", value: formatCurrency(s.todaySales), sub:`${s.paidBills} paid bills` },
    { label:"Orders", value: String(s.orders), sub:`${s.pendingBills} pending` },
    { label:"Tables Occupied", value: `${s.tablesOccupied}/30`, sub:"live floor" },
    { label:"Kitchen Pending", value: String(s.kitchenPending), sub:"NEW → PREPARING" },
    { label:"Delivery Orders", value: String(s.deliveryOrders), sub:"active" },
    { label:"New Customers (7d)", value: String(s.newCustomers), sub:"last 7 days" },
    { label:"Reviews", value: String(s.reviews), sub:`500 total` },
    { label:"Rewards Issued", value: String(s.rewardsIssued), sub:`${s.couponsRedeemed} redeemed` },
    { label:"Low Stock", value: String(s.lowStockItems), sub:"reorder needed", alert:true },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Badge>{new Date().toLocaleDateString("en-IN", { dateStyle:"long"})}</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map(i=>(
          <Card key={i.label} className={i.alert ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30" : ""}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-500">{i.label}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{i.value}</div>
              <div className="text-xs text-zinc-500">{i.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Business Rule • QR Reward Flow</CardTitle></CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
          <p>One paid bill = one reward claim. Server validates billId, paymentStatus, claim status & campaign rules. Duplicate scans return <code>ALREADY_CLAIMED</code>.</p>
          <p>Try: <Link className="underline" href="/qr/bill_0001">/qr/[billId]</Link> • POS → Bill → QR → Review → Reward → Coupon</p>
        </CardContent>
      </Card>
    </div>
  );
}
