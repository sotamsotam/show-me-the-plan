import { describe, expect, it } from 'vitest';
import { maskEmailHint } from './email-hint';

describe('maskEmailHint', () => {
  it('masks the local part after the first three characters', () => {
    expect(maskEmailHint('abcdefghij@hanmail.net')).toBe('abc*******@hanmail.net');
  });

  it('leaves short local parts unmasked', () => {
    expect(maskEmailHint('ab@hanmail.net')).toBe('ab@hanmail.net');
  });

  it('shows exactly three visible characters when the local part is longer', () => {
    expect(maskEmailHint('user@example.com')).toBe('use*@example.com');
  });

  it('returns a fallback for invalid email shapes', () => {
    expect(maskEmailHint('invalid')).toBe('***@***');
  });
});
