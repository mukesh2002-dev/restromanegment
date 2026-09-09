"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Utensils, Table2, ShoppingCart, Flame, Users, Star, Gift, Package, Truck, MessageCircle, BarChart3, Settings, LogOut } from "lucide-react";
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
  const filtered = nav.filter(n=> n.roles.includes(role));
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800">
      <div className="px-6 py-5 border-b dark:border-zinc-800">
        <div className="font-bold text-lg leading-none">Spice Garden</div>
        <div className="text-xs text-zinc-500">RestroERP • {role}</div>
      </div>
      <nav className="flex-1 overflow-auto p-3 space-y-1">
        {filtered.map(item=>{
          const active = pathname?.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors", active ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800")}>
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t dark:border-zinc-800 space-y-3">
        <div className="flex justify-center">
          <ThemeToggleCompact />
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
