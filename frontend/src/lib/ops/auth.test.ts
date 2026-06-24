import { describe, expect, it } from 'vitest';
import { toAsciiHeaderValue } from './auth';

describe('toAsciiHeaderValue', () => {
  it('returns ASCII labels unchanged', () => {
    expect(toAsciiHeaderValue('ops-qa-runner')).toBe('ops-qa-runner');
  });

  it('URI-encodes non-ASCII labels for HTTP headers', () => {
    expect(toAsciiHeaderValue('운영자')).toBe(
      encodeURIComponent('운영자')
    );
  });

  it('returns undefined for blank values', () => {
    expect(toAsciiHeaderValue('   ')).toBeUndefined();
  });
});
