import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchOnboardingStatus,
  fetchOnboardingQuestions,
  saveOnboardingResponses,
  skipOnboarding,
  normalizeQuestionsResponse,
  normalizeOnboardingStatus,
} from './onboarding';
import { apiFetch } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}));

describe('Onboarding API Service', () => {
  const mockApiFetch = vi.mocked(apiFetch);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Normalizers', () => {
    it('normalizeQuestionsResponse handles envelopes and raw arrays', () => {
      const raw = [
        {
          id: 'q1',
          code: 'q_primary_goal',
          question: 'What are you here for?',
          hint: null,
          type: 'single',
          options: [{ value: 'room', label: 'A room / PG' }],
          required: true,
          sortOrder: 10,
          answered: 'room',
        },
        {
          id: 'q2',
          code: 'q_college',
          question: 'Which college?',
          type: 'text',
          options: [],
          required: false,
          answered: null,
        },
      ];

      const list = normalizeQuestionsResponse({ questions: raw });
      expect(list).toHaveLength(2);
      expect(list[0].type).toBe('single');
      expect(list[0].answered).toBe('room');
      expect(list[1].type).toBe('text');
      expect(normalizeQuestionsResponse(raw)).toHaveLength(2);
      expect(normalizeQuestionsResponse(null)).toEqual([]);
    });

    it('normalizeOnboardingStatus tolerates missing progress', () => {
      const status = normalizeOnboardingStatus({ status: 'pending', completedAt: null, skippedAt: null });
      expect(status.status).toBe('pending');
      expect(status.progress).toBeUndefined();
    });

    it('normalizeOnboardingStatus maps progress counts', () => {
      const status = normalizeOnboardingStatus({
        status: 'pending',
        progress: { total: 7, answered: 1, requiredTotal: 1, requiredAnswered: 1 },
      });
      expect(status.progress?.requiredAnswered).toBe(1);
    });
  });

  describe('API calls', () => {
    it('fetchOnboardingStatus GETs /api/v1/onboarding/status', async () => {
      mockApiFetch.mockResolvedValue({ status: 'pending' });
      const status = await fetchOnboardingStatus();
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET', path: '/api/v1/onboarding/status' })
      );
      expect(status.status).toBe('pending');
    });

    it('fetchOnboardingQuestions GETs /api/v1/onboarding/questions', async () => {
      mockApiFetch.mockResolvedValue({ questions: [] });
      await fetchOnboardingQuestions();
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET', path: '/api/v1/onboarding/questions' })
      );
    });

    it('saveOnboardingResponses POSTs answers and returns status', async () => {
      mockApiFetch.mockResolvedValue({ status: 'completed' });
      const status = await saveOnboardingResponses([
        { questionId: 'q1', answer: 'room' },
        { questionId: 'q2', answer: ['non-smoker'] },
      ]);
      expect(mockApiFetch).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/v1/onboarding/responses',
        body: {
          answers: [
            { questionId: 'q1', answer: 'room' },
            { questionId: 'q2', answer: ['non-smoker'] },
          ],
        },
      });
      expect(status.status).toBe('completed');
    });

    it('skipOnboarding POSTs /api/v1/onboarding/skip', async () => {
      mockApiFetch.mockResolvedValue({ status: 'skipped' });
      const status = await skipOnboarding();
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST', path: '/api/v1/onboarding/skip' })
      );
      expect(status.status).toBe('skipped');
    });
  });
});