import { Skeleton } from '@/components/ui/skeleton';

export default function PropertyDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Header Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-9 w-2/3 rounded-xl" />
        <Skeleton className="h-4 w-1/3 rounded-md" />
      </div>

      {/* Hero & Media Skeleton */}
      <Skeleton className="h-[360px] w-full rounded-3xl" />

      {/* Details Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
