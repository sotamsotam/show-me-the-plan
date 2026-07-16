export function buildStudentCachePrefix(studentUserId: number | null): string {
  return studentUserId === null ? 'self' : String(studentUserId);
}

export function buildRangeCacheKey(
  studentUserId: number | null,
  start: string,
  end: string,
  namespace?: string,
  variant?: string | null
): string {
  const prefix = buildStudentCachePrefix(studentUserId);
  const parts = [prefix, start, end];
  if (variant) {
    parts.push(variant);
  }
  const base = parts.join(':');
  return namespace ? `${namespace}:${base}` : base;
}

export interface RangeQueryCacheOptions {
  maxEntriesPerStudent?: number;
}

interface CacheEntry<T> {
  data: T;
}

export interface RangeQueryCache<T> {
  read(key: string): T | undefined;
  invalidateByStudentPrefix(studentPrefix: string): void;
  invalidateAll(): void;
  getOrFetch(
    key: string,
    studentPrefix: string,
    fetcher: () => Promise<T>,
    options?: { force?: boolean }
  ): Promise<T>;
}

export function createRangeQueryCache<T>(
  options: RangeQueryCacheOptions = {}
): RangeQueryCache<T> {
  const maxEntriesPerStudent = options.maxEntriesPerStudent ?? 12;
  const entries = new Map<string, CacheEntry<T>>();
  const inFlight = new Map<string, Promise<T>>();
  const lruByStudent = new Map<string, string[]>();

  function touch(studentPrefix: string, key: string) {
    const order = (lruByStudent.get(studentPrefix) ?? []).filter((item) => item !== key);
    order.push(key);

    while (order.length > maxEntriesPerStudent) {
      const evictedKey = order.shift();
      if (evictedKey) {
        entries.delete(evictedKey);
        inFlight.delete(evictedKey);
      }
    }

    lruByStudent.set(studentPrefix, order);
  }

  function read(key: string): T | undefined {
    return entries.get(key)?.data;
  }

  function cacheKeyMatchesStudentPrefix(key: string, studentPrefix: string): boolean {
    const segments = key.split(':');

    if (segments[0] === studentPrefix) {
      return true;
    }

    // namespaced keys: {namespace}:{studentPrefix}:{start}:{end}[:variant]
    return segments.length >= 2 && segments[1] === studentPrefix;
  }

  function invalidateByStudentPrefix(studentPrefix: string) {
    for (const key of Array.from(entries.keys())) {
      if (cacheKeyMatchesStudentPrefix(key, studentPrefix)) {
        entries.delete(key);
      }
    }

    for (const key of Array.from(inFlight.keys())) {
      if (cacheKeyMatchesStudentPrefix(key, studentPrefix)) {
        inFlight.delete(key);
      }
    }

    lruByStudent.delete(studentPrefix);
  }

  function invalidateAll() {
    entries.clear();
    inFlight.clear();
    lruByStudent.clear();
  }

  async function getOrFetch(
    key: string,
    studentPrefix: string,
    fetcher: () => Promise<T>,
    options?: { force?: boolean }
  ): Promise<T> {
    if (!options?.force) {
      const cached = read(key);
      if (cached !== undefined) {
        touch(studentPrefix, key);
        return cached;
      }

      const pending = inFlight.get(key);
      if (pending) {
        return pending;
      }
    } else {
      entries.delete(key);
      inFlight.delete(key);
    }

    const request = fetcher()
      .then((data) => {
        entries.set(key, { data });
        touch(studentPrefix, key);
        return data;
      })
      .finally(() => {
        if (inFlight.get(key) === request) {
          inFlight.delete(key);
        }
      });

    inFlight.set(key, request);
    return request;
  }

  return {
    read,
    invalidateByStudentPrefix,
    invalidateAll,
    getOrFetch,
  };
}
