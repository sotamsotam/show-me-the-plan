'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  invalidateCachedProfileSubjects,
  readCachedProfileSubjects,
  writeCachedProfileSubjects,
} from '@/lib/cached-profile-subjects';
import { withStudentUserId } from '@/lib/manager-student';
import { publishProfileSubjects, subscribeProfileSubjects } from '@/lib/profile-subjects-store';
import {
  getSubjectOptions,
  resolveProfileSubjects,
  type ProfileSubjectsInput,
  type SubjectOption,
  type UserSubject,
} from '@/lib/user-subject';
import { getTodayIsoDate, shiftIsoDate } from '@/lib/user-schedule';

interface UseProfileSubjectsOptions {
  studentUserId?: number | null;
  enabled?: boolean;
}

interface UseProfileSubjectsResult {
  subjects: UserSubject[];
  subjectOptions: SubjectOption[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

function resolveDisplayedSubjects(
  rawSubjects: ProfileSubjectsInput,
  loading: boolean,
  waitingForStudent: boolean,
  managerStudentMode: boolean
): UserSubject[] {
  if (rawSubjects !== null) {
    return resolveProfileSubjects(rawSubjects);
  }

  if (loading || waitingForStudent || managerStudentMode) {
    return [];
  }

  return resolveProfileSubjects(null);
}

async function fetchSubjectsFallback(
  studentUserId: number | null
): Promise<ProfileSubjectsInput | null> {
  if (!studentUserId) {
    return null;
  }

  const today = getTodayIsoDate();
  const params = new URLSearchParams({
    start: today,
    end: shiftIsoDate(today, 1),
  });
  const res = await fetch(withStudentUserId(`/api/timetable?${params}`, studentUserId), {
    credentials: 'include',
  });
  const data = await res.json();

  if (!res.ok || !Array.isArray(data.subjects) || data.subjects.length === 0) {
    return null;
  }

  return data.subjects;
}

export function useProfileSubjects(
  options: UseProfileSubjectsOptions = {}
): UseProfileSubjectsResult {
  const studentUserId = options.studentUserId ?? null;
  const enabled = options.enabled ?? true;
  const waitingForStudent = enabled === false;
  const [rawSubjects, setRawSubjects] = useState<ProfileSubjectsInput>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cacheRevision, setCacheRevision] = useState(0);

  useEffect(() => subscribeProfileSubjects(() => setCacheRevision((value) => value + 1)), []);

  const applyCachedSubjects = useCallback(() => {
    if (!enabled) {
      return false;
    }

    const cached = readCachedProfileSubjects(studentUserId);
    if (cached === undefined) {
      return false;
    }

    setRawSubjects(cached);
    setLoading(false);
    setError('');
    return true;
  }, [enabled, studentUserId]);

  useEffect(() => {
    applyCachedSubjects();
  }, [applyCachedSubjects, cacheRevision]);

  const load = useCallback(
    async (force = false) => {
      if (!enabled) {
        setRawSubjects(null);
        setLoading(false);
        setError('');
        return;
      }

      if (!force && applyCachedSubjects()) {
        return;
      }

      if (force) {
        invalidateCachedProfileSubjects(studentUserId);
      }

      setLoading(true);
      setError('');

      try {
        const res = await fetch(withStudentUserId('/api/profile/subjects', studentUserId), {
          credentials: 'include',
        });
        const data = await res.json();

        if (!res.ok) {
          if (applyCachedSubjects()) {
            return;
          }

          const fallbackSubjects = await fetchSubjectsFallback(studentUserId);
          if (fallbackSubjects) {
            publishProfileSubjects(studentUserId, fallbackSubjects);
            setRawSubjects(fallbackSubjects);
            return;
          }

          setError(data.error ?? '과목 목록을 불러오지 못했습니다.');
          setRawSubjects(null);
          return;
        }

        const subjects = data.subjects ?? null;
        publishProfileSubjects(studentUserId, subjects);
        setRawSubjects(subjects);
      } catch {
        if (applyCachedSubjects()) {
          return;
        }

        try {
          const fallbackSubjects = await fetchSubjectsFallback(studentUserId);
          if (fallbackSubjects) {
            publishProfileSubjects(studentUserId, fallbackSubjects);
            setRawSubjects(fallbackSubjects);
            return;
          }
        } catch {
          // ignore fallback errors
        }

        setError('과목 목록을 불러오지 못했습니다.');
        setRawSubjects(null);
      } finally {
        setLoading(false);
      }
    },
    [applyCachedSubjects, enabled, studentUserId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(() => load(true), [load]);

  const subjects = resolveDisplayedSubjects(
    rawSubjects,
    loading,
    waitingForStudent,
    Boolean(studentUserId)
  );

  return {
    subjects,
    subjectOptions: getSubjectOptions(rawSubjects),
    loading,
    error,
    reload,
  };
}
