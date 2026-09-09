import { Skeleton } from '@/components/ui/skeleton';

export default function GlobalLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/80 bg-card p-4 space-y-3.5 shadow-xs"
          >
            <Skeleton className="h-52 w-full rounded-xl" />
            <div className="space-y-2 pt-1">
              <Skeleton className="h-5 w-4/5 rounded-md" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
