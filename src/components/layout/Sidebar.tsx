"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Utensils, Table2, ShoppingCart, Flame, Users, Star, Gift, Package, Truck, MessageCircle, BarChart3, Settings, LogOut, Menu, X } from "lucide-react";
import { ThemeToggleCompact } from "@/components/theme-toggle";

const nav = [
  { href:"/dashboard", label:"Dashboard", icon: LayoutDashboard, roles:["OWNER","MANAGER","CASHIER","WAITER","KITCHEN_STAFF","CHEF","DELIVERY_MANAGER"] },
  { href:"/pos", label:"POS & Billing", icon: ShoppingCart, roles:["OWNER","MANAGER","CASHIER","WAITER"] },
  { href:"/menu", label:"Menu & Categories", icon: Utensils, roles:["OWNER","MANAGER"] },
  { href:"/tables", label:"Tables & QR", icon: Table2, roles:["OWNER","MANAGER","WAITER"] },
  { href:"/kot", label:"KOT / Kitchen", icon: Flame, roles:["OWNER","MANAGER","CHEF","KITCHEN_STAFF","KITCHEN_MANAGER"] },
  { href:"/customers", label:"Customers / CRM", icon: Users, roles:["OWNER","MANAGER","CASHIER"] },
  { href:"/reviews", label:"QR & Reviews", icon: Star, roles:["OWNER","MANAGER"] },
  { href:"/rewards", label:"Loyalty & Coupons", icon: Gift, roles:["OWNER","MANAGER","CASHIER"] },
  { href:"/inventory", label:"Inventory", icon: Package, roles:["OWNER","MANAGER"] },
  { href:"/delivery", label:"Delivery Orders", icon: Truck, roles:["OWNER","MANAGER","DELIVERY_MANAGER"] },
  { href:"/whatsapp", label:"WhatsApp", icon: MessageCircle, roles:["OWNER","MANAGER"] },
  { href:"/reports", label:"Reports", icon: BarChart3, roles:["OWNER","MANAGER"] },
  { href:"/settings", label:"Settings", icon: Settings, roles:["OWNER","MANAGER"] },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const filtered = nav.filter(n=> n.roles.includes(role));
  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={()=> setMobileOpen(v=>!v)}
        className="md:hidden fixed top-3 left-3 z-40 inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/40 z-30" onClick={()=> setMobileOpen(false)} />}

      {/* Fixed sidebar - desktop always visible, mobile slide */}
      <aside className={cn(
        "flex w-64 shrink-0 flex-col border-r bg-white dark:bg-zinc-950 dark:border-zinc-800 fixed left-0 top-0 h-screen z-30 transition-transform duration-200",
        "md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="px-6 py-5 border-b dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="font-bold text-lg leading-none tracking-tight text-zinc-900 dark:text-zinc-100">Spice Garden</div>
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">RestroERP • {role}</div>
        </div>
        <nav className="flex-1 overflow-auto p-3 space-y-1 bg-white dark:bg-zinc-950">
          {filtered.map(item=>{
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={()=> setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all border border-transparent",
                  active
                    ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white shadow-sm"
                    : "text-zinc-700 hover:bg-zinc-100 hover:border-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:border-zinc-800 dark:hover:text-zinc-100"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-3">
          <div className="flex justify-center">
            <ThemeToggleCompact />
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 border border-transparent hover:border-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:border-zinc-800 transition-colors">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
