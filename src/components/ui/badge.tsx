import { cn } from "@/lib/utils";
export function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100", className)} {...props} />;
}
