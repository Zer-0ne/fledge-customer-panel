import { Skeleton } from '@/components/ui/skeleton';

export default function ProtectedLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Banner Skeleton */}
      <Skeleton className="h-44 w-full rounded-3xl" />

      {/* Grid of Dashboard Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="size-4 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/5 rounded-md" />
              <Skeleton className="h-3.5 w-4/5 rounded-md" />
            </div>
            <Skeleton className="h-4 w-20 rounded-md pt-1" />
          </div>
        ))}
      </div>

      {/* Profile Card Skeleton */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-2xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-3.5 w-24 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/60">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
