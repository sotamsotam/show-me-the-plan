'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getSubjectOptions,
  resolveProfileSubjects,
  type ProfileSubjectsInput,
  type SubjectOption,
  type UserSubject,
} from '@/lib/user-subject';

interface UseProfileSubjectsResult {
  subjects: UserSubject[];
  subjectOptions: SubjectOption[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

export function useProfileSubjects(): UseProfileSubjectsResult {
  const [rawSubjects, setRawSubjects] = useState<ProfileSubjectsInput>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/profile/subjects', { credentials: 'include' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '과목 목록을 불러오지 못했습니다.');
        setRawSubjects(null);
        return;
      }

      setRawSubjects(data.subjects ?? null);
    } catch {
      setError('과목 목록을 불러오지 못했습니다.');
      setRawSubjects(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const subjects = resolveProfileSubjects(rawSubjects);

  return {
    subjects,
    subjectOptions: getSubjectOptions(rawSubjects),
    loading,
    error,
    reload: load,
  };
}
