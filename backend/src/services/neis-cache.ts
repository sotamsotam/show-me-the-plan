import type { SchoolScheduleEvent, TimetableEntry } from './neis';

export interface TimetableCacheBundle {
  entries: TimetableEntry[];
  scheduleEvents: SchoolScheduleEvent[];
}

export interface TimetableCacheKeyParams {
  schoolLevel: string;
  atptOfcdcScCode: string;
  sdSchulCode: string;
  grade: string;
  className: string;
  fromDate: string;
  toDate: string;
  ay: string;
  sem: string;
}

interface TimetableCacheEntry {
  data: TimetableCacheBundle;
  expiresAt: number;
}

const timetableCache = new Map<string, TimetableCacheEntry>();

let cacheHits = 0;
let cacheMisses = 0;

const DEFAULT_TTL_HOURS = 12;
const DEFAULT_MAX_ENTRIES = 2000;

export function isNeisCacheEnabled(): boolean {
  const value = process.env.NEIS_CACHE_ENABLED;
  if (value === undefined || value === '') {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return normalized !== 'false' && normalized !== '0';
}

export function getTimetableCacheTtlMs(): number {
  const raw = process.env.NEIS_CACHE_TTL_HOURS;
  const hours = raw === undefined || raw === '' ? DEFAULT_TTL_HOURS : Number(raw);

  if (!Number.isFinite(hours) || hours <= 0) {
    return DEFAULT_TTL_HOURS * 60 * 60 * 1000;
  }

  return hours * 60 * 60 * 1000;
}

export function getTimetableCacheMaxEntries(): number {
  const raw = process.env.NEIS_CACHE_MAX_ENTRIES;
  const maxEntries =
    raw === undefined || raw === '' ? DEFAULT_MAX_ENTRIES : Number(raw);

  if (!Number.isFinite(maxEntries) || maxEntries <= 0) {
    return DEFAULT_MAX_ENTRIES;
  }

  return maxEntries;
}

export function buildTimetableCacheKey(params: TimetableCacheKeyParams): string {
  return [
    params.schoolLevel,
    params.atptOfcdcScCode,
    params.sdSchulCode,
    params.grade,
    params.className,
    params.fromDate,
    params.toDate,
    params.ay,
    params.sem,
  ].join(':');
}

export function getCachedTimetableBundle(key: string): TimetableCacheBundle | null {
  const entry = timetableCache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    timetableCache.delete(key);
    return null;
  }

  return entry.data;
}

export function getCachedTimetable(key: string): TimetableEntry[] | null {
  return getCachedTimetableBundle(key)?.entries ?? null;
}

export function setCachedTimetableBundle(
  key: string,
  data: TimetableCacheBundle,
  ttlMs: number
): void {
  timetableCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });

  pruneTimetableCache(getTimetableCacheMaxEntries());
}

export function setCachedTimetable(
  key: string,
  data: TimetableEntry[],
  ttlMs: number
): void {
  setCachedTimetableBundle(key, { entries: data, scheduleEvents: [] }, ttlMs);
}

export function pruneTimetableCache(maxEntries: number): void {
  const now = Date.now();

  for (const [key, entry] of timetableCache) {
    if (now >= entry.expiresAt) {
      timetableCache.delete(key);
    }
  }

  if (timetableCache.size <= maxEntries) {
    return;
  }

  const sortedEntries = [...timetableCache.entries()].sort(
    (a, b) => a[1].expiresAt - b[1].expiresAt
  );

  const removeCount = timetableCache.size - maxEntries;
  for (let i = 0; i < removeCount; i++) {
    timetableCache.delete(sortedEntries[i][0]);
  }
}

export function recordTimetableCacheHit(): void {
  cacheHits += 1;
}

export function recordTimetableCacheMiss(): void {
  cacheMisses += 1;
}

export function getTimetableCacheStats() {
  return {
    hits: cacheHits,
    misses: cacheMisses,
    entryCount: timetableCache.size,
  };
}

export function resetTimetableCacheForTests(): void {
  timetableCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}
