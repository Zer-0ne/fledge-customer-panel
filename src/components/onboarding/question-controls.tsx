'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { OnboardingAnswerValue, OnboardingQuestion } from '@/types';

const chipBase =
  'group flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60';
const chipIdle =
  'border-border/70 bg-muted/40 text-foreground/85 hover:border-foreground/20 hover:bg-muted/70';
const chipActive =
  'border-foreground/30 bg-foreground/[0.06] text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_24px_-12px_rgba(255,255,255,0.18)]';

function ChipCheck({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200',
        selected
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-transparent text-transparent'
      )}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
  );
}

/** Single-select option chips. */
export function SingleChoice({
  question,
  value,
  onChange,
}: {
  question: OnboardingQuestion;
  value?: OnboardingAnswerValue;
  onChange: (value: OnboardingAnswerValue) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {question.options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(chipBase, selected ? chipActive : chipIdle)}
          >
            <span>{option.label}</span>
            <ChipCheck selected={selected} />
          </button>
        );
      })}
    </div>
  );
}

/** Multi-select chips — toggle each option in/out. */
export function MultiChoice({
  question,
  value,
  onChange,
}: {
  question: OnboardingQuestion;
  value?: OnboardingAnswerValue;
  onChange: (value: OnboardingAnswerValue) => void;
}) {
  const selected = Array.isArray(value) ? value : [];
  const toggle = (optionValue: string) => {
    const next = selected.includes(optionValue)
      ? selected.filter((item) => item !== optionValue)
      : [...selected, optionValue];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2.5">
      {question.options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            role="checkbox"
            aria-checked={active}
            onClick={() => toggle(option.value)}
            className={cn(chipBase, active ? chipActive : chipIdle)}
          >
            <span>{option.label}</span>
            <ChipCheck selected={active} />
          </button>
        );
      })}
    </div>
  );
}

/** Boolean question rendered as a Yes/No switch pair (form toggles = switches). */
export function BooleanChoice({
  value,
  onChange,
}: {
  value?: OnboardingAnswerValue;
  onChange: (value: OnboardingAnswerValue) => void;
}) {
  const selected = value === true || value === false ? value : null;
  return (
    <div className="grid grid-cols-2 gap-3">
      {[true, false].map((option) => {
        const active = selected === option;
        return (
          <button
            key={String(option)}
            type="button"
            role="switch"
            aria-checked={active}
            onClick={() => onChange(option)}
            className={cn(chipBase, 'justify-center', active ? chipActive : chipIdle)}
          >
            <span className={cn('text-base', active && 'font-semibold')}>
              {option ? 'Yes' : 'No'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Free-text answer. */
export function TextChoice({
  value,
  onChange,
}: {
  value?: OnboardingAnswerValue;
  onChange: (value: OnboardingAnswerValue) => void;
}) {
  return (
    <input
      type="text"
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Type your answer…"
      autoFocus
      className="w-full rounded-2xl border border-border/70 bg-muted/40 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all focus:border-foreground/25 focus:outline-none focus:ring-2 focus:ring-ring/40"
    />
  );
}