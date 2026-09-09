import { Skeleton, CardSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
