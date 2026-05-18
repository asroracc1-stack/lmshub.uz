import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export default function TableSkeleton({ rows = 5, cols = 6 }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3 grid-cols-12 items-center rounded-2xl border border-border/60 bg-muted/50 p-4 animate-pulse">
          {[...Array(cols)].map((__, cellIndex) => (
            <Skeleton key={cellIndex} className="h-8 rounded-xl col-span-2" />
          ))}
        </div>
      ))}
    </div>
  );
}
