export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-lg font-bold text-foreground">You are offline</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Owl Sight needs an internet connection. Reconnect and try again.
      </p>
    </div>
  );
}
