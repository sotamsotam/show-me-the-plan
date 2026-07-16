import type { EventInput } from '@fullcalendar/core';

import {
  buildRangeCacheKey,
  buildStudentCachePrefix,
  createRangeQueryCache,
} from '@/lib/range-query-cache';
import type { ScheduleCategory, UserSchedule } from '@/lib/user-schedule';

const CACHE_NAMESPACE = 'user-schedules';

const cache = createRangeQueryCache<UserScheduleRangeData>();

type InvalidationListener = (studentUserId: number | null) => void;

const invalidationListeners = new Set<InvalidationListener>();

export interface UserScheduleRangeData {
  schedules: UserSchedule[];
  events: EventInput[];
}

export interface UserScheduleRangeQuery {
  start: string;
  end: string;
  studentUserId: number | null;
  scheduleCategory?: ScheduleCategory;
}

function normalizeSchedules(raw: UserSchedule[] | undefined): UserSchedule[] {
  return (raw ?? []).map((schedule) => ({
    ...schedule,
    allDay: schedule.allDay ?? false,
    endDate: schedule.endDate ?? null,
    scheduleCategory: schedule.scheduleCategory ?? 'managed',
    excludedDates: schedule.excludedDates ?? [],
    overrides: schedule.overrides ?? {},
  }));
}

function buildUserSchedulesCacheKey(options: UserScheduleRangeQuery): string {
  return buildRangeCacheKey(
    options.studentUserId,
    options.start,
    options.end,
    CACHE_NAMESPACE,
    options.scheduleCategory ?? null
  );
}

async function fetchUserSchedulesFromApi(
  start: string,
  end: string,
  withStudent: (url: string) => string,
  scheduleCategory?: ScheduleCategory
): Promise<UserScheduleRangeData> {
  const params = new URLSearchParams({ start, end });
  if (scheduleCategory) {
    params.set('scheduleCategory', scheduleCategory);
  }
  const res = await fetch(withStudent(`/api/user-schedules?${params}`), {
    credentials: 'include',
  });
  const data = (await res.json()) as {
    schedules?: UserSchedule[];
    events?: EventInput[];
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error ?? '일정을 불러오지 못했습니다.');
  }

  // Next.js API route already maps expanded events to FullCalendar EventInput.
  return {
    schedules: normalizeSchedules(data.schedules),
    events: data.events ?? [],
  };
}

export function readCachedUserSchedulesInRange(
  options: UserScheduleRangeQuery
): UserScheduleRangeData | undefined {
  return cache.read(buildUserSchedulesCacheKey(options));
}

export async function getUserSchedulesInRange(
  options: UserScheduleRangeQuery,
  withStudent: (url: string) => string,
  fetchOptions?: { force?: boolean }
): Promise<UserScheduleRangeData> {
  const studentPrefix = buildStudentCachePrefix(options.studentUserId);
  const key = buildUserSchedulesCacheKey(options);

  return cache.getOrFetch(
    key,
    studentPrefix,
    () =>
      fetchUserSchedulesFromApi(
        options.start,
        options.end,
        withStudent,
        options.scheduleCategory
      ),
    fetchOptions
  );
}

export function subscribeUserSchedulesInvalidation(
  listener: InvalidationListener
): () => void {
  invalidationListeners.add(listener);
  return () => {
    invalidationListeners.delete(listener);
  };
}

export function invalidateCachedUserSchedules(studentUserId: number | null): void {
  cache.invalidateByStudentPrefix(buildStudentCachePrefix(studentUserId));
  for (const listener of invalidationListeners) {
    listener(studentUserId);
  }
}
