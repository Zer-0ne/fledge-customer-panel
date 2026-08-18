import { describe, it, expect } from 'vitest';
import { extractAuthTokens } from './tokens';

describe('extractAuthTokens', () => {
  it('extracts top-level camelCase tokens', () => {
    const input = { accessToken: 'acc_123', refreshToken: 'ref_456' };
    const result = extractAuthTokens(input);
    expect(result).toEqual({ accessToken: 'acc_123', refreshToken: 'ref_456' });
  });

  it('extracts snake_case tokens', () => {
    const input = { access_token: 'acc_snake', refresh_token: 'ref_snake' };
    const result = extractAuthTokens(input);
    expect(result).toEqual({ accessToken: 'acc_snake', refreshToken: 'ref_snake' });
  });

  it('extracts token alias key', () => {
    const input = { token: 'acc_alias' };
    const result = extractAuthTokens(input);
    expect(result).toEqual({ accessToken: 'acc_alias' });
  });

  it('extracts nested tokens inside data envelope', () => {
    const input = {
      success: true,
      data: { accessToken: 'nested_acc', refreshToken: 'nested_ref' },
    };
    const result = extractAuthTokens(input);
    expect(result).toEqual({ accessToken: 'nested_acc', refreshToken: 'nested_ref' });
  });

  it('extracts nested tokens inside tokens property', () => {
    const input = {
      tokens: { access_token: 'tok_acc', refresh_token: 'tok_ref' },
    };
    const result = extractAuthTokens(input);
    expect(result).toEqual({ accessToken: 'tok_acc', refreshToken: 'tok_ref' });
  });

  it('returns null for empty or invalid input', () => {
    expect(extractAuthTokens(null)).toBeNull();
    expect(extractAuthTokens(undefined)).toBeNull();
    expect(extractAuthTokens('invalid')).toBeNull();
    expect(extractAuthTokens({})).toBeNull();
  });
});
