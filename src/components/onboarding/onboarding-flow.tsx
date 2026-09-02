'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/auth-provider';
import {
  fetchOnboardingQuestions,
  saveOnboardingResponses,
  skipOnboarding,
} from '@/lib/api/services/onboarding';
import type { OnboardingAnswerValue, OnboardingQuestion } from '@/types';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/errors';
import { Check, ChevronRight, Sparkles } from 'lucide-react';
import { SingleChoice, MultiChoice, BooleanChoice, TextChoice } from './question-controls';

type AnswerMap = Record<string, OnboardingAnswerValue>;

function isAnswered(question: OnboardingQuestion, answers: AnswerMap) {
  const value = answers[question.id];
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function QuestionControl({ question, value, onChange }: { question: OnboardingQuestion; value?: OnboardingAnswerValue; onChange: (value: OnboardingAnswerValue) => void }) {
  switch (question.type) {
    case 'multi':
      return <MultiChoice question={question} value={value} onChange={onChange} />;
    case 'boolean':
      return <BooleanChoice value={value} onChange={onChange} />;
    case 'text':
      return <TextChoice value={value} onChange={onChange} />;
    default:
      return <SingleChoice question={question} value={value} onChange={onChange} />;
  }
}

function OnboardingCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-background/85 p-4 backdrop-blur-xl sm:p-6">
      <div className={cn('w-full max-w-lg overflow-hidden rounded-3xl border border-border/70 bg-card/95 shadow-2xl shadow-black/40 backdrop-blur-xl', className)}>
        {children}
      </div>
    </div>
  );
}

/** Loading skeleton state. */
function LoadingCard() {
  return (
    <OnboardingCard>
      <div className="space-y-4 px-6 py-6">
        <div className="h-5 w-2/3 animate-pulse rounded-lg bg-muted/70" />
        <div className="h-4 w-1/2 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-11 animate-pulse rounded-2xl bg-muted/40" />
        <div className="h-11 animate-pulse rounded-2xl bg-muted/40" />
      </div>
    </OnboardingCard>
  );
}

/** Success state — shown briefly before the overlay unmounts. */
function DoneCard() {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 p-4 backdrop-blur-xl">
      <div className="onboarding-fade w-full max-w-sm rounded-3xl border border-border/70 bg-card/95 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary shadow-[0_0_32px_-8px_rgba(255,255,255,0.35)]">
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-foreground">You&apos;re all set!</h2>
        <p className="mt-1 text-sm text-muted-foreground">We&apos;ve saved your answers.</p>
      </div>
    </div>
  );
}

type Phase = 'loading' | 'questions' | 'done';

/**
 * Post-login onboarding overlay — full-screen glass card over the protected UI.
 * Shows one question at a time; submit enables once all required are answered.
 * Production: seeds answers from server `answered` so partially-answered users
 * aren't forced to re-answer, and handles empty catalog gracefully.
 */
export function OnboardingFlow() {
  const { refreshSession } = useAuth();
  const [phase, setPhase] = React.useState<Phase>('loading');
  const [questions, setQuestions] = React.useState<OnboardingQuestion[]>([]);
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<AnswerMap>({});
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    fetchOnboardingQuestions()
      .then((list) => {
        if (!mounted) return;
        if (list.length === 0) {
          // No active questions for this audience → nothing to block on.
          // Treat as immediately done so the layout can hide the overlay.
          setQuestions([]);
          setPhase('done');
          // Refresh to confirm status, but don't loop if still pending with 0 required.
          window.setTimeout(() => void refreshSession(), 300);
          window.setTimeout(() => setPhase('questions'), 1200);
          return;
        }
        // Seed answers map from server `answered` so required gating respects
        // already-answered questions (e.g. user answered q_primary_goal last session).
        const seeded: AnswerMap = {};
        for (const q of list) {
          if (q.answered !== null && q.answered !== undefined) {
            // Normalize: server may return "" for text, [] for multi — treat same as answered check.
            const v = q.answered as OnboardingAnswerValue;
            if (typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : true) {
              seeded[q.id] = v;
            }
          }
        }
        setAnswers(seeded);
        setQuestions(list);
        setPhase('questions');
      })
      .catch(() => {
        if (!mounted) return;
        setError('Question list failed to load. Please refresh.');
        setPhase('questions');
      });
    return () => {
      mounted = false;
    };
  }, [refreshSession]);

  if (phase === 'loading') return <LoadingCard />;
  if (phase === 'done' && questions.length === 0) return null;

  const question = questions[index];
  if (!question) return null;

  const answeredCurrent = isAnswered(question, answers);
  const requiredDone = questions.every((q) => !q.required || isAnswered(q, answers));
  const isLast = index === questions.length - 1;
  const progressPct = questions.length === 0 ? 100 : Math.round(((index + (answeredCurrent ? 1 : 0)) / questions.length) * 100);

  const updateAnswer = (value: OnboardingAnswerValue) => {
    setAnswers((previous) => ({ ...previous, [question.id]: value }));
    setError(null);
  };

  const next = () => {
    if (question.required && !answeredCurrent) return;
    if (isLast) return;
    setIndex((previous) => previous + 1);
  };

  const submitOnce = () =>
    saveOnboardingResponses(
      Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }))
    );

  const submit = async () => {
    if (!requiredDone || submitting) return;
    setSubmitting(true);
    try {
      await submitOnce();
      setPhase('done');
      window.setTimeout(() => void refreshSession(), 900);
    } catch (error) {
      // Access token may have expired mid-flow — refresh once, then retry.
      if (error instanceof ApiError && error.status === 401) {
        try {
          await refreshSession();
          await submitOnce();
          setPhase('done');
          window.setTimeout(() => void refreshSession(), 900);
          return;
        } catch {
          // fall through to the error state below
        }
      }
      setError('Could not save your answers. Please try again.');
      setSubmitting(false);
    }
  };

  const skipOnce = async () => {
    try {
      return await skipOnboarding();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await refreshSession();
        return skipOnboarding();
      }
      throw error;
    }
  };

  const skip = async () => {
    setSubmitting(true);
    try {
      await skipOnce();
      setPhase('done');
      window.setTimeout(() => void refreshSession(), 900);
    } catch {
      setError('Could not skip right now. Please try again.');
      setSubmitting(false);
    }
  };

  if (phase === 'done') return <DoneCard />;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-background/85 backdrop-blur-xl">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute bottom-0 right-[-6rem] h-64 w-96 rounded-full bg-primary/[0.05] blur-3xl" />
      </div>
      <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-border/60 bg-card/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border/50 bg-muted/20 px-6 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-inner">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Let&apos;s set up your profile</p>
              <p className="text-xs text-muted-foreground">A few quick questions — you&apos;re nearly done</p>
            </div>
            {/* progress */}
            <span className="text-xs tabular-nums font-medium text-muted-foreground">
              Step {index + 1} of {questions.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full bg-muted/60">
            <div
              className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            <div key={question.id} className="onboarding-fade">
              <h2 className="text-lg font-semibold leading-snug text-foreground">{question.question}</h2>
              {question.hint ? (
                <p className="mt-1.5 text-sm text-muted-foreground">{question.hint}</p>
              ) : null}
              {question.required && !answeredCurrent ? (
                <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground/80">Required</p>
              ) : null}
              <div className="mt-5">
                <QuestionControl question={question} value={answers[question.id]} onChange={updateAnswer} />
              </div>
              {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border/50 bg-muted/10 px-6 py-4">
            <Button variant="ghost" size="sm" onClick={skip} disabled={submitting} className="text-muted-foreground hover:text-foreground">
              Skip for now
            </Button>
            {isLast ? (
              <Button size="sm" onClick={submit} disabled={!requiredDone || submitting} className="gap-1.5">
                {submitting ? 'Saving…' : 'Finish'}
                <Check className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={next} disabled={(question.required && !answeredCurrent) || submitting} className="gap-1.5">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
