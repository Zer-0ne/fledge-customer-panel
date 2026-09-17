import { Skeleton } from '@/components/ui/skeleton';

export default function MessagesLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 animate-in fade-in duration-200 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl sm:w-72" />
      </div>

      <div className="flex items-center gap-2 border-b border-border pb-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>

      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5 rounded-xl border border-border/60 bg-card/50 p-4">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5 rounded-md" />
              <Skeleton className="h-3.5 w-4/5 rounded-md" />
            </div>
            <Skeleton className="h-3.5 w-14 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
