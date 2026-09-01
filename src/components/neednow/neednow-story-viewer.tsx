'use client';

/**
 * Instagram/WhatsApp-style story viewer for Need Now requests.
 *
 * Features (ported from Flutter `neednow_story_viewer.dart`):
 * - 30s auto-advance per request with live segmented progress bars
 * - Tap left 1/3 = previous, right 2/3 = next (WhatsApp zones)
 * - Swipe down to dismiss (spring-back or slide-off)
 * - Subtle 3D tilt while swiping between pages
 * - Glassmorphism hero card + section cards
 * - "View requirement" CTA linking to the detail page
 * - Keyboard: ←/→ navigate, Escape closes
 * - Seen IDs tracked in localStorage (no backend call)
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, MapPin, Timer, ChevronRight } from 'lucide-react';
import { UserAvatar } from './user-avatar';
import { markSeen } from './neednow-seen-store';
import {
  formatBudgetRangePaise,
  formatRemainingTime,
  NEED_NOW_INTENT_LABELS,
  STAY_DURATION_LABELS,
  FURNISHING_LABELS,
  STUDENT_WORKING_LABELS,
} from '@/lib/api/services/neednow';
import { NeedNowRequest } from '@/types';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const HOLD_DURATION_MS = 30_000;
const SWIPE_DOWN_CLOSE_VELOCITY = 300;
const SWIPE_DOWN_CLOSE_DISTANCE = 140;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NeedNowStoryViewerProps {
  /** Full list of active Need Now requests to show as stories. */
  requests: NeedNowRequest[];
  /** Which request to start on (0-indexed). */
  initialIndex?: number;
  /** Called when the viewer is closed. */
  onClose: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NeedNowStoryViewer({
  requests,
  initialIndex = 0,
  onClose,
}: NeedNowStoryViewerProps) {
  const router = useRouter();
  const [index, setIndex] = React.useState(
    Math.max(0, Math.min(initialIndex, requests.length - 1)),
  );
  const [progress, setProgress] = React.useState(0); // 0..1
  const [dragDy, setDragDy] = React.useState(0);
  const [closing, setClosing] = React.useState(false);
  const [springBack, setSpringBack] = React.useState(false);
  const progressRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const draggingRef = React.useRef(false);
  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  const current = requests[index];

  // Mark current as seen whenever index changes
  React.useEffect(() => {
    if (current) markSeen(current.id);
  }, [current]);

  // Start progress timer for the current item
  React.useEffect(() => {
    setProgress(0);
    if (draggingRef.current) return;

    const start = performance.now();
    let raf: number;

    const tick = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setProgress(pct);
      if (pct < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [index, draggingRef.current]);

  // Auto-advance when progress hits 1
  React.useEffect(() => {
    if (progress >= 1 && !draggingRef.current) {
      goNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  // Keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Lock body scroll
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────

  function goNext() {
    if (index + 1 >= requests.length) {
      handleClose();
      return;
    }
    setIndex((i) => i + 1);
  }

  function goPrev() {
    if (index > 0) {
      setIndex((i) => i - 1);
    }
  }

  function handleClose() {
    onClose();
  }

  function handleViewRequirement() {
    handleClose();
    router.push(`/need-now/${current.id}`);
  }

  // ── Tap zones (WhatsApp-style) ────────────────────────────────────────────

  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.33) {
      goPrev();
    } else {
      goNext();
    }
  }

  // ── Swipe down to dismiss ──────────────────────────────────────────────────

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    draggingRef.current = true;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dy = touch.clientY - touchStartRef.current.y;
    if (dy > 0) {
      setDragDy(dy);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    const velocity = dt > 0 ? (dy / dt) * 1000 : 0;
    touchStartRef.current = null;
    draggingRef.current = false;

    if (velocity > SWIPE_DOWN_CLOSE_VELOCITY || dy > SWIPE_DOWN_CLOSE_DISTANCE) {
      // Dismiss
      setClosing(true);
      setTimeout(handleClose, 250);
    } else {
      // Spring back
      setSpringBack(true);
      setTimeout(() => {
        setDragDy(0);
        setSpringBack(false);
      }, 250);
    }
  }

  // Also support mouse drag for desktop
  const mouseDownRef = React.useRef(false);
  const mouseStartRef = React.useRef<{ y: number } | null>(null);

  function handleMouseDown(e: React.MouseEvent) {
    mouseDownRef.current = true;
    mouseStartRef.current = { y: e.clientY };
    draggingRef.current = true;
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!mouseDownRef.current || !mouseStartRef.current) return;
    const dy = e.clientY - mouseStartRef.current.y;
    if (dy > 0) setDragDy(dy);
  }

  function handleMouseUp(e: React.MouseEvent) {
    if (!mouseDownRef.current || !mouseStartRef.current) return;
    const dy = e.clientY - mouseStartRef.current.y;
    mouseDownRef.current = false;
    mouseStartRef.current = null;
    draggingRef.current = false;

    if (dy > SWIPE_DOWN_CLOSE_DISTANCE) {
      setClosing(true);
      setTimeout(handleClose, 250);
    } else {
      setSpringBack(true);
      setTimeout(() => {
        setDragDy(0);
        setSpringBack(false);
      }, 250);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function intentTitle(req: NeedNowRequest): string {
    switch (req.intentType) {
      case 'SEEKING_PRIVATE_ROOM':
        return 'Need a private room';
      case 'SEEKING_SHARED_ROOM':
        return 'Need a shared room';
      case 'SEEKING_FULL_FLAT':
        return 'Need a full flat';
      case 'SEEKING_PG':
        return 'Need a PG bed';
      default:
        return `Need ${NEED_NOW_INTENT_LABELS[req.intentType]?.toLowerCase() || 'housing'}`;
    }
  }

  function preferencesLine(req: NeedNowRequest): string {
    if (!req.preferences) return 'No preferences';
    const parts: string[] = [];
    parts.push(NEED_NOW_INTENT_LABELS[req.intentType] || req.intentType);
    if (req.preferences.furnishing === 'FULLY_FURNISHED') parts.push('Furnished');
    if (req.preferences.studentOrProfessional === 'STUDENT') parts.push('Student');
    if (req.preferences.smokingOk === false) parts.push('Non-smoker');
    return parts.length > 0 ? parts.join(' · ') : 'No preferences';
  }

  function moveInLabel(req: NeedNowRequest): string {
    if (req.moveInDate) return `Move-in ${req.moveInDate}`;
    if (req.stayDurationType) return STAY_DURATION_LABELS[req.stayDurationType] || 'Flexible';
    return 'Flexible';
  }

  if (!current) return null;

  const remaining = formatRemainingTime(current.remainingSeconds, current.status);
  const isUrgent = current.status === 'ACTIVE' && (current.remainingSeconds ?? 0) < 21600;
  const budget = formatBudgetRangePaise(
    current.budget.minimumPaise,
    current.budget.maximumPaise,
  );
  const locationName = current.location?.name || current.areas?.[0]?.locationName || '';

  // Compute transform for drag
  const opacity = Math.max(0, 1 - (dragDy / 800) * 0.6);
  const transform = closing
    ? `translateY(${dragDy + (window.innerHeight - dragDy)}px)`
    : springBack
      ? 'translateY(0px)'
      : `translateY(${dragDy}px)`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Need Now story viewer"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Story container */}
      <div
        className={cn(
          'relative flex h-full w-full max-w-lg flex-col overflow-hidden',
          'bg-background/95 backdrop-blur-xl',
          'transition-transform duration-200 ease-out',
          springBack && 'transition-transform duration-200',
        )}
        style={{
          transform,
          opacity,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* ── Progress bars ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 px-3 pt-3 pb-1">
          {requests.map((req, i) => (
            <ProgressBar
              key={req.id}
              index={i}
              currentIndex={index}
              progress={progress}
            />
          ))}
          <button
            onClick={handleClose}
            className="ml-2 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close story viewer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-4 py-3">
          <UserAvatar
            name={current.owner.displayName}
            avatarUrl={current.owner.avatarUrl}
            verified={current.owner.verified}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {current.owner.displayName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {NEED_NOW_INTENT_LABELS[current.intentType]}
            </p>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground">
            {remaining}
          </span>
        </div>

        {/* ── Tap zones overlay ──────────────────────────────────────────── */}
        <div
          className="absolute inset-0 z-10"
          onClick={handleTap}
          style={{ pointerEvents: 'auto' }}
        />

        {/* ── Story content (scrollable) ─────────────────────────────────── */}
        <div className="relative z-20 flex-1 overflow-y-auto px-4 pb-6">
          <div className="flex flex-col gap-3">
            {/* Hero card */}
            <div className="rounded-2xl border border-white/5 bg-secondary/50 p-4">
              {isUrgent && (
                <span className="mb-2.5 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                  Urgent
                </span>
              )}
              <h2 className="text-lg font-bold text-foreground">
                {intentTitle(current)}
              </h2>
              {locationName && (
                <p className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 text-primary/70" />
                  {locationName}
                  <span className="mx-1">·</span>
                  {budget}
                </p>
              )}
            </div>

            {/* Move-in */}
            <StorySection title="Move-in" body={moveInLabel(current)} />

            {/* Preferences */}
            <StorySection title="Preferences" body={preferencesLine(current)} />

            {/* About */}
            <StorySection
              title="About"
              body={current.description || 'No introduction added.'}
            />

            {/* CTA */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewRequirement();
              }}
              className={cn(
                'mt-2 flex items-center justify-center gap-2 rounded-xl',
                'bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground',
                'hover:bg-primary/90 transition-colors',
              )}
            >
              View requirement
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({
  index,
  currentIndex,
  progress,
}: {
  index: number;
  currentIndex: number;
  progress: number;
}) {
  const filled = index < currentIndex;
  const active = index === currentIndex;
  const upcoming = index > currentIndex;

  return (
    <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
      <div
        className={cn(
          'h-full rounded-full transition-none',
          filled && 'bg-white/60',
          active && 'bg-white/90',
          upcoming && 'bg-transparent',
        )}
        style={{
          width: filled
            ? '100%'
            : active
              ? `${Math.min(progress * 100, 100)}%`
              : '0%',
        }}
      />
    </div>
  );
}

// ─── Story Section Card ────────────────────────────────────────────────────────

function StorySection({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-secondary/40 p-3.5 backdrop-blur-md">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
