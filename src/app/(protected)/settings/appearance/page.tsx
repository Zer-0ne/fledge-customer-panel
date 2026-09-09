'use client';

import * as React from 'react';
import {
  useTheme,
  Theme,
  COLOR_THEME_OPTIONS,
  FONT_SCALE_OPTIONS,
} from '@/components/providers/theme-provider';
import { Sun, Moon, Laptop, Check, Palette, Type, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppearanceSettingsPage() {
  const {
    theme,
    setTheme,
    colorTheme,
    setColorTheme,
    fontScale,
    setFontScale,
    resolvedTheme,
  } = useTheme();

  const modeOptions: {
    label: string;
    value: Theme;
    description: string;
    icon: React.ElementType;
  }[] = [
    {
      label: 'Light Mode',
      value: 'light',
      description: 'Clean bright interface with high-contrast text',
      icon: Sun,
    },
    {
      label: 'Dark Mode',
      value: 'dark',
      description: 'Deep sleek dark theme to ease eye strain',
      icon: Moon,
    },
    {
      label: 'System Preference',
      value: 'system',
      description: 'Syncs automatically with your device settings',
      icon: Laptop,
    },
  ];

  return (
    <section className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Palette className="size-5 text-primary" />
          Appearance & Display
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customize your visual experience, accent palette, and font scaling across Fledge.
        </p>
      </div>

      {/* 1. Appearance Mode */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Theme Mode</h3>
          <span className="text-xs text-muted-foreground capitalize">
            Current: {resolvedTheme} mode
          </span>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          role="radiogroup"
          aria-label="Theme Mode Selection"
        >
          {modeOptions.map(({ label, value, description, icon: Icon }) => {
            const isSelected = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setTheme(value)}
                className={cn(
                  'p-4 border rounded-2xl text-left transition-all flex flex-col justify-between space-y-3 cursor-pointer',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={cn(
                      'p-2.5 rounded-xl',
                      isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  {isSelected && (
                    <span className="p-1 rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3.5" />
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">{label}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Accent Color Palette */}
      <div className="space-y-3 pt-5 border-t border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="size-4 text-primary" />
              Accent Color Palette
            </h3>
            <p className="text-xs text-muted-foreground">
              Select your highlight color for buttons, badges, and focus rings
            </p>
          </div>
          <span className="capitalize text-xs font-semibold text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            {colorTheme}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {COLOR_THEME_OPTIONS.map(({ value, label, dotClass }) => {
            const isSelected = colorTheme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setColorTheme(value)}
                className={cn(
                  'p-3.5 border rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs scale-[1.02]'
                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                )}
              >
                <div className="relative flex items-center justify-center">
                  <span className={cn('size-7 rounded-full shadow-xs', dotClass)} />
                  {isSelected && (
                    <Check className="size-4 text-white absolute drop-shadow-md" />
                  )}
                </div>
                <span className="text-xs font-medium text-foreground text-center truncate max-w-full">
                  {label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Text Size & Scaling */}
      <div className="space-y-3 pt-5 border-t border-border/60">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Type className="size-4 text-primary" />
            Text Size & Readability
          </h3>
          <p className="text-xs text-muted-foreground">
            Adjust typography scaling across listings, chats, and search feeds
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FONT_SCALE_OPTIONS.map(({ value, label, description, sizeLabel }) => {
            const isSelected = fontScale === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFontScale(value)}
                className={cn(
                  'p-4 border rounded-2xl text-left transition-all flex flex-col justify-between space-y-2 cursor-pointer',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-extrabold text-base text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                    {sizeLabel}
                  </span>
                  {isSelected && (
                    <span className="p-1 rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3.5" />
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-foreground">{label}</h4>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
