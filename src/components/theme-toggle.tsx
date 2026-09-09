"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";

export function ThemeToggle({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const { resolved, toggle } = useTheme();
  return (
    <Button
      variant={variant as never}
      size="icon"
      aria-label={resolved === "dark" ? "Switch to light" : "Switch to dark"}
      onClick={toggle}
      className="h-8 w-8 shrink-0"
      title={resolved === "dark" ? "Light mode" : "Dark mode"}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

// Inline small badge for header
export function ThemeToggleCompact() {
  const { resolved, theme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-1 rounded-full border bg-white dark:bg-zinc-900 dark:border-zinc-700 p-1">
      <button
        onClick={() => setTheme("light")}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${resolved === "light" && theme !== "system" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500"}`}
      >
        Light
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${resolved === "dark" && theme !== "system" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500"}`}
      >
        Dark
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`rounded-full px-2.5 py-1 text-xs transition-colors ${theme === "system" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500"}`}
        title="Follow system"
      >
        Auto
      </button>
    </div>
  );
}
