import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import {
  parseLimitError,
  limitReachedCopy,
} from './unverified-limits';

function limitErr(code: string, current?: number, max?: number): ApiError {
  return new ApiError({
    status: 400,
    message: 'capped',
    code,
    details: { code, message: 'capped', current, max },
  });
}

describe('parseLimitError', () => {
  it('parses post limit with dynamic counts', () => {
    expect(parseLimitError(limitErr('UNVERIFIED_POST_LIMIT_REACHED', 2, 2))).toMatchObject({
      kind: 'posts',
      current: 2,
      max: 2,
    });
  });

  it('parses request and contact limits', () => {
    expect(parseLimitError(limitErr('UNVERIFIED_REQUEST_LIMIT_REACHED', 1, 1))?.kind).toBe('requests');
    expect(parseLimitError(limitErr('UNVERIFIED_CONTACT_LIMIT_REACHED', 3, 3))?.kind).toBe('contacts');
    expect(parseLimitError(limitErr('UNVERIFIED_POSTING_DISABLED', 0, 0))?.kind).toBe('posts');
  });

  it('returns null for other errors', () => {
    expect(parseLimitError(limitErr('SOME_OTHER_CODE'))).toBeNull();
    expect(parseLimitError(new Error('plain'))).toBeNull();
    expect(parseLimitError(null)).toBeNull();
  });
});

describe('limitReachedCopy', () => {
  it('uses backend numbers, never hardcoded caps', () => {
    const copy = limitReachedCopy('posts', { current: 5, max: 5 });
    expect(copy.body).toContain('5 active posts');
    const contacts = limitReachedCopy('contacts', { current: 7, max: 7 });
    expect(contacts.body).toContain('7 contacts per day');
  });
});
