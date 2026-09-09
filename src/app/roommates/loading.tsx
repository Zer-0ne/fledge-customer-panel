import { Skeleton } from '@/components/ui/skeleton';

export default function RoommatesLoading() {
  return (
    <div className="min-h-screen bg-background py-8 animate-in fade-in duration-200">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Banner Section Skeleton */}
        <Skeleton className="h-56 w-full rounded-3xl" />

        {/* Filters Bar Skeleton */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>

        {/* Content Section Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-3 w-20 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
