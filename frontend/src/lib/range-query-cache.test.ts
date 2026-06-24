import { describe, expect, it, vi } from 'vitest';

import {
  buildRangeCacheKey,
  buildStudentCachePrefix,
  createRangeQueryCache,
} from './range-query-cache';

describe('buildStudentCachePrefix', () => {
  it('uses self for the signed-in student', () => {
    expect(buildStudentCachePrefix(null)).toBe('self');
  });

  it('uses the numeric id for managed students', () => {
    expect(buildStudentCachePrefix(42)).toBe('42');
  });
});

describe('createRangeQueryCache', () => {
  it('returns cached data on repeated reads', async () => {
    const cache = createRangeQueryCache<string>();
    const fetcher = vi.fn(async () => 'payload');

    await cache.getOrFetch('self:2026-06-01:2026-06-30', 'self', fetcher);
    const second = await cache.getOrFetch('self:2026-06-01:2026-06-30', 'self', fetcher);

    expect(second).toBe('payload');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cache.read('self:2026-06-01:2026-06-30')).toBe('payload');
  });

  it('deduplicates in-flight requests', async () => {
    const cache = createRangeQueryCache<string>();
    let resolveFetch: ((value: string) => void) | undefined;
    const fetcher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const first = cache.getOrFetch('self:2026-06-01:2026-06-30', 'self', fetcher);
    const second = cache.getOrFetch('self:2026-06-01:2026-06-30', 'self', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    resolveFetch?.('shared');
    await expect(first).resolves.toBe('shared');
    await expect(second).resolves.toBe('shared');
  });

  it('bypasses cache when force is true', async () => {
    const cache = createRangeQueryCache<string>();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    await cache.getOrFetch('self:2026-06-01:2026-06-30', 'self', fetcher);
    const forced = await cache.getOrFetch(
      'self:2026-06-01:2026-06-30',
      'self',
      fetcher,
      { force: true }
    );

    expect(forced).toBe('second');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('invalidates only the matching student prefix', async () => {
    const cache = createRangeQueryCache<string>();
    const fetcher = vi
      .fn()
      .mockImplementation(async (label: string) => label);

    await cache.getOrFetch('self:2026-06-01:2026-06-30', 'self', () => fetcher('self'));
    await cache.getOrFetch('42:2026-06-01:2026-06-30', '42', () => fetcher('42'));

    cache.invalidateByStudentPrefix('self');

    expect(cache.read('self:2026-06-01:2026-06-30')).toBeUndefined();
    expect(cache.read('42:2026-06-01:2026-06-30')).toBe('42');
  });

  it('evicts the oldest entry per student when max entries is exceeded', async () => {
    const cache = createRangeQueryCache<string>({ maxEntriesPerStudent: 2 });
    const fetcher = vi.fn(async (value: string) => value);

    await cache.getOrFetch('self:2026-06-01:2026-06-30', 'self', () => fetcher('june'));
    await cache.getOrFetch('self:2026-07-01:2026-07-31', 'self', () => fetcher('july'));
    await cache.getOrFetch('self:2026-08-01:2026-08-31', 'self', () => fetcher('august'));

    expect(cache.read('self:2026-06-01:2026-06-30')).toBeUndefined();
    expect(cache.read('self:2026-07-01:2026-07-31')).toBe('july');
    expect(cache.read('self:2026-08-01:2026-08-31')).toBe('august');
  });
});

describe('buildRangeCacheKey', () => {
  it('includes namespace when provided', () => {
    expect(
      buildRangeCacheKey(null, '2026-06-01', '2026-06-30', 'user-schedules')
    ).toBe('user-schedules:self:2026-06-01:2026-06-30');
  });
});
