import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export async function Header() {
  const s = await getSession();
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-4 md:px-6 pl-12 md:pl-6 dark:bg-zinc-950/90 dark:border-zinc-800 sticky top-0 z-20">
      <div className="flex items-center gap-2 md:hidden font-bold tracking-tight text-zinc-900 dark:text-zinc-100 ml-2">Spice Garden</div>
      <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hidden md:block tracking-tight">Production-ready Restaurant Management • Optimized</div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {s ? (
          <span className="text-sm hidden sm:inline-flex items-center gap-1.5">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{s.name}</span> <span className="text-zinc-500 dark:text-zinc-400">• {s.role}</span>
          </span>
        ) : (
          <span className="text-sm text-zinc-500">Not signed in</span>
        )}
      </div>
    </header>
  );
}
