'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CircularCarouselItem = {
  id: string;
  title: string;
  description: string;
  tag: string;
};

type CircularCarouselProps = {
  items: CircularCarouselItem[];
  className?: string;
};

function shortestOffset(index: number, active: number, length: number) {
  let delta = index - active;
  const half = Math.floor(length / 2);
  if (delta > half) delta -= length;
  if (delta < -half) delta += length;
  return delta;
}

export function CircularCarousel({ items, className }: CircularCarouselProps) {
  const count = items.length;
  const [active, setActive] = React.useState(0);
  const dragX = React.useRef<number | null>(null);
  const swiped = React.useRef(false);
  const [paused, setPaused] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);

  React.useEffect(() => {
    if (count < 2 || paused || hovered) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const timer = window.setInterval(() => {
      if (!document.hidden && !motion.matches && dragX.current === null) {
        setActive((index) => (index + 1) % count);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [count, paused, hovered, active]);

  const go = (next: number) => {
    if (count === 0) return;
    setActive(((next % count) + count) % count);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(active - 1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(active + 1);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!e.isPrimary || e.button !== 0) return;
    swiped.current = false;
    dragX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragX.current == null) return;
    const dx = e.clientX - dragX.current;
    dragX.current = null;
    if (Math.abs(dx) < 40) return;
    swiped.current = true;
    go(dx > 0 ? active - 1 : active + 1);
  };

  if (count === 0) return null;

  const current = String(active + 1).padStart(2, '0');
  const total = String(count).padStart(2, '0');

  return (
    <div
      className={cn('flex w-full flex-col items-center gap-6', className)}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setPaused(true)}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Platform features"
    >
      <div
        className="relative h-[280px] w-full max-w-4xl touch-pan-y select-none overflow-hidden [perspective:1100px] [transform-style:preserve-3d] sm:h-[300px]"
        onClickCapture={(e) => {
          if (swiped.current) {
            e.preventDefault();
            e.stopPropagation();
            swiped.current = false;
          }
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragX.current = null;
        }}
      >
        {items.map((item, index) => {
          const offset = shortestOffset(index, active, count);
          const abs = Math.abs(offset);
          const hidden = abs > 2;
          const scale = abs === 0 ? 1 : abs === 1 ? 0.92 : 0.84;
          const x = offset * 56;
          const z = abs === 0 ? 48 : abs === 1 ? -90 : -180;
          const tilt = offset * -12;

          return (
            <button
              key={item.id}
              type="button"
              aria-hidden={hidden || abs !== 0}
              tabIndex={abs === 0 ? 0 : -1}
              onClick={() => go(index)}
              className={cn(
                'absolute top-1/2 left-1/2 w-[min(100%-2rem,22rem)] rounded-2xl border border-border/50 bg-card p-6 text-left shadow-sm transition-[transform,opacity] duration-300 ease-out [transform-style:preserve-3d]',
                'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                hidden && 'pointer-events-none'
              )}
              style={{
                transform: `translate(-50%, -50%) translateX(${x}%) translateZ(${z}px) rotateY(${tilt}deg) scale(${scale})`,
                opacity: hidden ? 0 : abs === 0 ? 1 : abs === 1 ? 0.55 : 0.28,
                zIndex: 10 - abs,
              }}
            >
              <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                {item.tag}
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-card-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>

      <p className="tabular-nums text-muted-foreground" aria-live={paused ? 'polite' : 'off'}>
        <span className="text-2xl font-semibold text-foreground">{current}</span>
        <span className="ml-1.5 text-sm">of {total}</span>
      </p>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play /> : <Pause />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          aria-label="Previous slide"
          onClick={() => go(active - 1)}
        >
          <ChevronLeft />
        </Button>

        <div className="flex items-center gap-1.5" role="tablist" aria-label="Slides">
          {items.map((item, index) => {
            const isActive = index === active;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Slide ${index + 1}`}
                onClick={() => go(index)}
                className={cn(
                  'size-1.5 rounded-full transition-colors',
                  isActive
                    ? 'bg-primary'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
              />
            );
          })}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          aria-label="Next slide"
          onClick={() => go(active + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
