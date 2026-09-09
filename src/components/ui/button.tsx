import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default"|"outline"|"ghost"|"destructive";
  size?: "sm"|"default"|"lg"|"icon";
}
export function Button({ className, variant="default", size="default", ...props }: ButtonProps) {
  const base="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string,string> = {
    default:"bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900",
    outline:"border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950",
    ghost:"hover:bg-zinc-100 dark:hover:bg-zinc-800",
    destructive:"bg-red-600 text-white hover:bg-red-700",
  };
  const sizes: Record<string,string> = {
    default:"h-9 px-4 py-2", sm:"h-8 px-3 text-xs", lg:"h-10 px-6", icon:"h-9 w-9",
  };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
