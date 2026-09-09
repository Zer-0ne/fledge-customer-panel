import { Skeleton } from '@/components/ui/skeleton';

export default function MessagesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[650px] rounded-3xl border border-border/80 bg-card overflow-hidden">
        {/* Left conversations list skeleton */}
        <div className="md:col-span-4 border-r border-border/60 p-4 space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-border/40 bg-muted/20">
                <Skeleton className="size-11 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-3.5 w-1/2 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right chat message area skeleton */}
        <div className="hidden md:flex md:col-span-8 flex-col justify-between p-6 bg-muted/10">
          <div className="flex items-center gap-3 border-b border-border/50 pb-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          </div>
          <div className="space-y-4 py-8">
            <Skeleton className="h-12 w-2/3 rounded-2xl" />
            <Skeleton className="h-12 w-1/2 rounded-2xl ml-auto" />
            <Skeleton className="h-14 w-3/5 rounded-2xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
