import * as React from "react";
import { cn } from "@/lib/utils";
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return <input type={type} className={cn("flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950", className)} ref={ref} {...props} />;
});
Input.displayName="Input";
