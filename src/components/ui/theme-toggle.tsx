'use client';

import * as React from 'react';
import {
  useTheme,
  Theme,
  COLOR_THEME_OPTIONS,
  FONT_SCALE_OPTIONS,
} from '@/components/providers/theme-provider';
import { Sun, Moon, Laptop, Check, Palette, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const {
    theme,
    setTheme,
    resolvedTheme,
    colorTheme,
    setColorTheme,
    fontScale,
    setFontScale,
  } = useTheme();

  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('size-9 rounded-lg', className)}
        aria-label="Toggle Theme"
      >
        <Sun className="size-4 text-muted-foreground" />
      </Button>
    );
  }

  const modeOptions: { label: string; value: Theme; icon: React.ElementType }[] = [
    { label: 'Light', value: 'light', icon: Sun },
    { label: 'Dark', value: 'dark', icon: Moon },
    { label: 'System', value: 'system', icon: Laptop },
  ];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        className={cn('size-9 rounded-lg transition-colors hover:bg-accent', className)}
        aria-label="Theme & Display Customizer"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="size-4 text-foreground" />
        ) : (
          <Sun className="size-4 text-foreground" />
        )}
        <span className="sr-only">Theme and display settings</span>
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Appearance & Theme Settings"
          className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-popover/95 p-3 text-popover-foreground shadow-2xl backdrop-blur-xl z-50 focus:outline-none animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-2.5">
            <div className="flex items-center gap-1.5 font-semibold text-xs tracking-tight text-foreground">
              <Palette className="size-3.5 text-primary" />
              <span>Theme & Display</span>
            </div>
            <span className="text-[11px] text-muted-foreground capitalize">
              {resolvedTheme} • {fontScale}
            </span>
          </div>

          {/* 1. Mode Selector */}
          <div className="space-y-1.5 mb-3">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Mode
            </label>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1 border border-border/50">
              {modeOptions.map(({ label, value, icon: Icon }) => {
                const isSelected = theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all cursor-pointer',
                      isSelected
                        ? 'bg-background text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Color Themes */}
          <div className="space-y-1.5 mb-3">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Accent Palette</span>
              <span className="capitalize text-foreground font-semibold text-[10px]">
                {colorTheme}
              </span>
            </label>
            <div className="grid grid-cols-7 gap-1">
              {COLOR_THEME_OPTIONS.map(({ value, label, dotClass }) => {
                const isSelected = colorTheme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    title={label}
                    onClick={() => setColorTheme(value)}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full transition-all relative border cursor-pointer',
                      isSelected
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-transparent scale-110'
                        : 'border-transparent hover:scale-105'
                    )}
                  >
                    <span className={cn('size-5 rounded-full shadow-xs', dotClass)} />
                    {isSelected && (
                      <Check className="size-3 text-white absolute inset-0 m-auto drop-shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Text Size / Font Scaling */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Type className="size-3 text-primary" />
              <span>Text Size & Scaling</span>
            </label>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1 border border-border/50">
              {FONT_SCALE_OPTIONS.map(({ value, label, sizeLabel }) => {
                const isSelected = fontScale === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFontScale(value)}
                    className={cn(
                      'flex items-center justify-center gap-1 rounded-md py-1.5 text-xs transition-all cursor-pointer',
                      isSelected
                        ? 'bg-background text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    )}
                  >
                    <span className="font-bold text-[11px] text-primary">{sizeLabel}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
