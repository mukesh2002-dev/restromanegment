"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const [email, setEmail] = useState("owner@spicegarden.in");
  const [password, setPassword] = useState("password123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    const res = await fetch("/api/auth/login", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ email, password }) });
    const data = await res.json().catch(()=>({}));
    setLoading(false);
    if (!res.ok) { setErr(data.error || "Login failed"); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle variant="outline" />
      </div>
      <Card className="w-full max-w-md shadow-xl border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl tracking-tight">Spice Garden — RestroERP</CardTitle>
          <CardDescription>Sign in to continue. Demo: owner@spicegarden.in / password123</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="h-10" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="h-10" />
            </div>
            {err && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800 rounded p-2.5 animate-in slide-in-from-top-1">{err}</div>}
            <Button type="submit" className="w-full h-10 font-medium" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
            <div className="text-xs text-zinc-500 space-y-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 p-2.5">
              <div className="font-medium">Roles demo:</div>
              <div>owner@spicegarden.in / priya@spicegarden.in (Manager) / rohan@spicegarden.in (Cashier) — all password123</div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
