'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStudentApi } from '@/hooks/useStudentApi';
import {
  createEmptyExamPrepWeeklyPlansContext,
  fetchExamPrepWeeklyPlansContext,
  type ExamPrepWeeklyPlansContext,
} from '@/lib/exam-prep-weekly-plans-context';

export function useExamPrepWeeklyPlansContext() {
  const { withStudent, studentUserId } = useStudentApi();
  const [context, setContext] = useState<ExamPrepWeeklyPlansContext>(
    createEmptyExamPrepWeeklyPlansContext
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await fetchExamPrepWeeklyPlansContext(withStudent);

    if (result.ok) {
      setContext(result.context);
    } else {
      setContext(createEmptyExamPrepWeeklyPlansContext());
      setError(result.error ?? null);
    }

    setLoading(false);
  }, [withStudent]);

  useEffect(() => {
    refresh();
  }, [refresh, studentUserId]);

  return { context, loading, error, refresh };
}
