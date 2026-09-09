import { Skeleton } from '@/components/ui/skeleton';

export default function ListingDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Navigation Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>

      {/* Image Gallery Skeleton */}
      <div className="grid grid-cols-1 gap-4 overflow-hidden rounded-3xl md:grid-cols-3 max-h-[460px]">
        <Skeleton className="h-[340px] md:col-span-2 rounded-2xl" />
        <div className="hidden md:grid grid-rows-2 gap-4 h-full">
          <Skeleton className="h-full w-full rounded-2xl" />
          <Skeleton className="h-full w-full rounded-2xl" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-6 w-28 rounded-md" />
            </div>
            <Skeleton className="h-9 w-3/4 rounded-xl" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border/60 bg-card p-4 sm:grid-cols-4">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-6 w-36 rounded-md" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>

          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-md space-y-6">
            <div className="space-y-2 border-b border-border/50 pb-5">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-9 w-36 rounded-lg" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
