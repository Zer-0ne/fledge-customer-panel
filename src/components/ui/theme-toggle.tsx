'use client';

import * as React from 'react';
import { useTheme } from '@/components/providers/theme-provider';
import { Sun, Moon, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={`size-9 rounded-lg ${className}`} aria-label="Toggle Theme">
        <Sun className="size-4 text-muted-foreground" />
      </Button>
    );
  }

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className={`size-9 rounded-lg transition-colors hover:bg-accent ${className}`}
      title={`Current theme: ${theme} (${resolvedTheme}). Click to change.`}
      aria-label="Toggle Theme"
    >
      {theme === 'system' ? (
        <Laptop className="size-4 text-primary" />
      ) : resolvedTheme === 'dark' ? (
        <Moon className="size-4 text-amber-400" />
      ) : (
        <Sun className="size-4 text-amber-500" />
      )}
    </Button>
  );
}
