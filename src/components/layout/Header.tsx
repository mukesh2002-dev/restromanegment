import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export async function Header() {
  const s = await getSession();
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white/80 backdrop-blur px-4 md:px-6 dark:bg-zinc-950/80 dark:border-zinc-800 sticky top-0 z-10">
      <div className="flex items-center gap-2 md:hidden font-bold tracking-tight">Spice Garden</div>
      <div className="text-sm text-zinc-500 hidden md:block">Production-ready Restaurant Management • Optimized</div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {s ? (
          <span className="text-sm hidden sm:inline">
            <span className="font-medium">{s.name}</span> <span className="text-zinc-500">• {s.role}</span>
          </span>
        ) : (
          <span className="text-sm text-zinc-500">Not signed in</span>
        )}
      </div>
    </header>
  );
}
