import { Skeleton } from '@/components/ui/skeleton';

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Title & View Switcher Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-9 w-48 rounded-xl" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>

      {/* Grid + Map Split Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/80 bg-card p-3.5 space-y-3 shadow-xs">
                <Skeleton className="h-48 w-full rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-4/5 rounded-md" />
                  <Skeleton className="h-3.5 w-3/5 rounded-md" />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/50">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:block lg:col-span-5">
          <Skeleton className="h-[550px] w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
