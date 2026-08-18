import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-muted/80 text-muted-foreground mb-4">
        <FileQuestion className="size-10" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">404</h1>
      <h2 className="text-xl font-semibold text-foreground mt-2">Page Not Found</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        The page or listing you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <Button className="gap-2">
            <Home className="size-4" />
            Back to Home
          </Button>
        </Link>
        <Link href="/search">
          <Button variant="outline" className="gap-2">
            <Search className="size-4" />
            Search Flats
          </Button>
        </Link>
      </div>
    </div>
  );
}
