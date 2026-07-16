'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getUserSchedulesInRange,
  readCachedUserSchedulesInRange,
  subscribeUserSchedulesInvalidation,
  type UserScheduleRangeData,
} from '@/lib/cached-user-schedules';
import { useStudentApi } from '@/hooks/useStudentApi';
import type { EventInput } from '@fullcalendar/core';
import type { ScheduleCategory, UserSchedule } from '@/lib/user-schedule';

interface UseUserSchedulesInRangeOptions {
  start: string;
  end: string;
  enabled?: boolean;
  scheduleCategory?: ScheduleCategory;
}

interface UseUserSchedulesInRangeResult {
  schedules: UserSchedule[];
  events: EventInput[];
  isLoading: boolean;
  error: string;
  refetch: (force?: boolean) => Promise<void>;
}

export function useUserSchedulesInRange(
  options: UseUserSchedulesInRangeOptions
): UseUserSchedulesInRangeResult {
  const { start, end, enabled = true, scheduleCategory } = options;
  const { withStudent, studentUserId } = useStudentApi();
  const [data, setData] = useState<UserScheduleRangeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fetchIdRef = useRef(0);

  const load = useCallback(
    async (force = false) => {
      if (!enabled || !start || !end) {
        return;
      }

      const fetchId = ++fetchIdRef.current;
      const query = { start, end, studentUserId, scheduleCategory };

      if (!force) {
        const cached = readCachedUserSchedulesInRange(query);
        if (cached) {
          setData(cached);
          setError('');
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError('');

      try {
        const next = await getUserSchedulesInRange(query, withStudent, { force });

        if (fetchId !== fetchIdRef.current) {
          return;
        }

        setData(next);
        setError('');
      } catch (loadError) {
        if (fetchId !== fetchIdRef.current) {
          return;
        }

        setData(null);
        setError(
          loadError instanceof Error ? loadError.message : '일정을 불러오지 못했습니다.'
        );
      } finally {
        if (fetchId === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [enabled, end, scheduleCategory, start, studentUserId, withStudent]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return subscribeUserSchedulesInvalidation((invalidatedStudentUserId) => {
      if (invalidatedStudentUserId !== studentUserId) {
        return;
      }

      void load(false);
    });
  }, [enabled, load, studentUserId]);

  const refetch = useCallback(async (force = true) => {
    await load(force);
  }, [load]);

  return {
    schedules: data?.schedules ?? [],
    events: data?.events ?? [],
    isLoading,
    error,
    refetch,
  };
}
