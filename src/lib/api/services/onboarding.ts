/**
 * Onboarding API — post-login question flow (backend `src/onboarding/`).
 * Endpoints:
 *   GET  /api/v1/onboarding/status        -> { status, completedAt, skippedAt, progress }
 *   GET  /api/v1/onboarding/questions     -> { questions: [{ id, code, question, hint, type, options, required, sortOrder, answered }] }
 *   POST /api/v1/onboarding/responses     -> body { answers: [{ questionId, answer }] } -> status
 *   POST /api/v1/onboarding/skip          -> status
 */

import { apiFetch } from '@/lib/api/client';
import { OnboardingOption, OnboardingQuestion, OnboardingStatus } from '@/types';

export type OnboardingAnswerValue = string | string[] | boolean;

function mapRawToOption(item: unknown): OnboardingOption {
  const raw = (item || {}) as Record<string, unknown>;
  return {
    value: String(raw.value || ''),
    label: String(raw.label || raw.value || ''),
  };
}

function mapRawToQuestion(item: unknown): OnboardingQuestion {
  const raw = (item || {}) as Record<string, unknown>;
  const options: unknown[] = Array.isArray(raw.options) ? raw.options : [];
  return {
    id: String(raw.id || ''),
    code: String(raw.code || ''),
    question: String(raw.question || ''),
    hint: typeof raw.hint === 'string' ? raw.hint : null,
    type: (raw.type === 'multi' || raw.type === 'boolean' || raw.type === 'text' ? raw.type : 'single'),
    options: options.map(mapRawToOption),
    required: Boolean(raw.required),
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : 0,
    answered:
      typeof raw.answered === 'string' || typeof raw.answered === 'boolean' || Array.isArray(raw.answered)
        ? (raw.answered as OnboardingAnswerValue)
        : null,
  };
}

/** `{ questions: [...] }` envelope -> question array (tolerant of raw array too). */
export function normalizeQuestionsResponse(res: unknown): OnboardingQuestion[] {
  if (!res) return [];
  const obj = res as Record<string, unknown>;
  const items = Array.isArray(res) ? res : Array.isArray(obj.questions) ? obj.questions : [];
  return items.map(mapRawToQuestion);
}

/** Status payload -> OnboardingStatus (tolerant of missing progress). */
export function normalizeOnboardingStatus(res: unknown): OnboardingStatus {
  const raw = (res || {}) as Record<string, unknown>;
  const progress = raw.progress as Record<string, unknown> | undefined;
  return {
    status: raw.status === 'skipped' || raw.status === 'completed' ? raw.status : 'pending',
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : null,
    skippedAt: typeof raw.skippedAt === 'string' ? raw.skippedAt : null,
    progress: progress
      ? {
          total: Number(progress.total || 0),
          answered: Number(progress.answered || 0),
          requiredTotal: Number(progress.requiredTotal || 0),
          requiredAnswered: Number(progress.requiredAnswered || 0),
        }
      : undefined,
  };
}

export function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  return apiFetch({
    method: 'GET',
    path: '/api/v1/onboarding/status',
  }).then(normalizeOnboardingStatus);
}

export function fetchOnboardingQuestions(): Promise<OnboardingQuestion[]> {
  return apiFetch({
    method: 'GET',
    path: '/api/v1/onboarding/questions',
  }).then(normalizeQuestionsResponse);
}

export function saveOnboardingResponses(
  answers: { questionId: string; answer: OnboardingAnswerValue }[]
): Promise<OnboardingStatus> {
  return apiFetch({
    method: 'POST',
    path: '/api/v1/onboarding/responses',
    body: { answers },
  }).then(normalizeOnboardingStatus);
}

export function skipOnboarding(): Promise<OnboardingStatus> {
  return apiFetch({
    method: 'POST',
    path: '/api/v1/onboarding/skip',
  }).then(normalizeOnboardingStatus);
}