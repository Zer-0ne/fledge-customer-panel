import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-44 rounded-xl" />
          <Skeleton className="h-4 w-60 rounded-md" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      <div className="space-y-3 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-4 p-4 rounded-2xl border border-border/80 bg-card shadow-xs"
          >
            <Skeleton className="size-10 rounded-full shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-2/3 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
