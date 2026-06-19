'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStudentApi } from '@/hooks/useStudentApi';
import {
  createEmptyRegularWeeklyPlansContext,
  fetchRegularWeeklyPlansContext,
  type RegularWeeklyPlansContext,
} from '@/lib/regular-weekly-plans-context';

export function useRegularWeeklyPlansContext() {
  const { withStudent, studentUserId } = useStudentApi();
  const [context, setContext] = useState<RegularWeeklyPlansContext>(
    createEmptyRegularWeeklyPlansContext
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await fetchRegularWeeklyPlansContext(withStudent);

    if (result.ok) {
      setContext(result.context);
    } else {
      setContext(createEmptyRegularWeeklyPlansContext());
      setError(result.error ?? null);
    }

    setLoading(false);
  }, [withStudent]);

  useEffect(() => {
    refresh();
  }, [refresh, studentUserId]);

  return { context, loading, error, refresh };
}
