import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildTimetableCacheKey,
  getCachedTimetable,
  getTimetableCacheMaxEntries,
  getTimetableCacheStats,
  getTimetableCacheTtlMs,
  isNeisCacheEnabled,
  pruneTimetableCache,
  resetTimetableCacheForTests,
  setCachedTimetable,
} from './neis-cache';

const baseParams = {
  schoolLevel: 'middle',
  atptOfcdcScCode: 'B10',
  sdSchulCode: '7010567',
  grade: '2',
  className: '3',
  fromDate: '20260609',
  toDate: '20260615',
  ay: '2026',
  sem: '1',
};

const sampleEntries = [
  { date: '20260609', period: 1, subject: '국어' },
];

describe('neis-cache', () => {
  beforeEach(() => {
    resetTimetableCacheForTests();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('builds a stable cache key from school and date range', () => {
    const key = buildTimetableCacheKey(baseParams);

    expect(key).toBe('middle:B10:7010567:2:3:20260609:20260615:2026:1');
  });

  it('uses different keys for different date ranges', () => {
    const weekKey = buildTimetableCacheKey(baseParams);
    const monthKey = buildTimetableCacheKey({
      ...baseParams,
      fromDate: '20260601',
      toDate: '20260630',
    });

    expect(weekKey).not.toBe(monthKey);
  });

  it('returns cached entries on repeated lookup', () => {
    const key = buildTimetableCacheKey(baseParams);
    const ttlMs = 60_000;

    setCachedTimetable(key, sampleEntries, ttlMs);

    expect(getCachedTimetable(key)).toEqual(sampleEntries);
    expect(getCachedTimetable(key)).toEqual(sampleEntries);
  });

  it('expires entries after TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-09T00:00:00Z'));

    const key = buildTimetableCacheKey(baseParams);
    setCachedTimetable(key, sampleEntries, 1_000);

    expect(getCachedTimetable(key)).toEqual(sampleEntries);

    vi.advanceTimersByTime(1_001);

    expect(getCachedTimetable(key)).toBeNull();
  });

  it('caches empty arrays', () => {
    const key = buildTimetableCacheKey(baseParams);
    setCachedTimetable(key, [], 60_000);

    expect(getCachedTimetable(key)).toEqual([]);
  });

  it('respects NEIS_CACHE_ENABLED=false', () => {
    vi.stubEnv('NEIS_CACHE_ENABLED', 'false');
    expect(isNeisCacheEnabled()).toBe(false);

    vi.stubEnv('NEIS_CACHE_ENABLED', '0');
    expect(isNeisCacheEnabled()).toBe(false);

    vi.stubEnv('NEIS_CACHE_ENABLED', 'true');
    expect(isNeisCacheEnabled()).toBe(true);
  });

  it('parses cache TTL and max entries from env', () => {
    vi.stubEnv('NEIS_CACHE_TTL_HOURS', '6');
    vi.stubEnv('NEIS_CACHE_MAX_ENTRIES', '500');

    expect(getTimetableCacheTtlMs()).toBe(6 * 60 * 60 * 1000);
    expect(getTimetableCacheMaxEntries()).toBe(500);
  });

  it('prunes oldest-expiring entries when max entries exceeded', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-09T00:00:00Z'));

    setCachedTimetable('key-a', sampleEntries, 10_000);
    vi.advanceTimersByTime(1_000);
    setCachedTimetable('key-b', sampleEntries, 20_000);
    vi.advanceTimersByTime(1_000);
    setCachedTimetable('key-c', sampleEntries, 30_000);

    pruneTimetableCache(2);

    expect(getCachedTimetable('key-a')).toBeNull();
    expect(getCachedTimetable('key-b')).not.toBeNull();
    expect(getCachedTimetable('key-c')).not.toBeNull();
    expect(getTimetableCacheStats().entryCount).toBe(2);
  });
});
