import { Skeleton } from '@/components/ui/skeleton';

export default function NeedNowLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Banner Skeleton */}
      <Skeleton className="h-48 w-full rounded-3xl" />

      {/* Action / Header row */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <Skeleton className="h-6 w-4/5 rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
