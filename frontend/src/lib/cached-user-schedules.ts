import type { EventInput } from '@fullcalendar/core';

import {
  buildRangeCacheKey,
  buildStudentCachePrefix,
  createRangeQueryCache,
} from '@/lib/range-query-cache';
import type { UserSchedule } from '@/lib/user-schedule';

const CACHE_NAMESPACE = 'user-schedules';

const cache = createRangeQueryCache<UserScheduleRangeData>();

export interface UserScheduleRangeData {
  schedules: UserSchedule[];
  events: EventInput[];
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

async function fetchUserSchedulesFromApi(
  start: string,
  end: string,
  withStudent: (url: string) => string
): Promise<UserScheduleRangeData> {
  const params = new URLSearchParams({ start, end });
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

export function readCachedUserSchedulesInRange(options: {
  start: string;
  end: string;
  studentUserId: number | null;
}): UserScheduleRangeData | undefined {
  const key = buildRangeCacheKey(
    options.studentUserId,
    options.start,
    options.end,
    CACHE_NAMESPACE
  );
  return cache.read(key);
}

export async function getUserSchedulesInRange(
  options: {
    start: string;
    end: string;
    studentUserId: number | null;
  },
  withStudent: (url: string) => string,
  fetchOptions?: { force?: boolean }
): Promise<UserScheduleRangeData> {
  const studentPrefix = buildStudentCachePrefix(options.studentUserId);
  const key = buildRangeCacheKey(
    options.studentUserId,
    options.start,
    options.end,
    CACHE_NAMESPACE
  );

  return cache.getOrFetch(
    key,
    studentPrefix,
    () => fetchUserSchedulesFromApi(options.start, options.end, withStudent),
    fetchOptions
  );
}

export function invalidateCachedUserSchedules(studentUserId: number | null): void {
  cache.invalidateByStudentPrefix(buildStudentCachePrefix(studentUserId));
}
