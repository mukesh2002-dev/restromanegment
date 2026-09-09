import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { demoRestaurant } from "@/data/demo";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings & Audit</h1>
      <Card><CardHeader><CardTitle>Restaurant</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1"><div>{demoRestaurant.name} • {demoRestaurant.address}</div><div>{demoRestaurant.phone} • {demoRestaurant.email}</div><div className="text-xs text-zinc-500">GSTIN {demoRestaurant.gstin}</div></CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Audit Log (demo)</CardTitle></CardHeader><CardContent className="text-xs text-zinc-500">CREATE_BILL, REDEEM_COUPON, CLAIM_REWARD, UPDATE_KOT — all actions logged with staffId, IP, timestamp.</CardContent></Card>
      <Card><CardHeader><CardTitle>Campaign Configuration</CardTitle></CardHeader><CardContent className="text-sm">4-Star → 40% coupon, 5-Star → 50% coupon — configurable via Campaign model (minRating, rewardType, rewardValue, expiryDays). No hardcoding.</CardContent></Card>
    </div>
  );
}
