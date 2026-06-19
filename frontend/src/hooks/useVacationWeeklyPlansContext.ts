'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStudentApi } from '@/hooks/useStudentApi';
import {
  createEmptyVacationWeeklyPlansContext,
  fetchVacationWeeklyPlansContext,
  type VacationWeeklyPlansContext,
} from '@/lib/vacation-weekly-plans-context';

export function useVacationWeeklyPlansContext() {
  const { withStudent, studentUserId } = useStudentApi();
  const [context, setContext] = useState<VacationWeeklyPlansContext>(
    createEmptyVacationWeeklyPlansContext
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await fetchVacationWeeklyPlansContext(withStudent);

    if (result.ok) {
      setContext(result.context);
    } else {
      setContext(createEmptyVacationWeeklyPlansContext());
      setError(result.error ?? null);
    }

    setLoading(false);
  }, [withStudent]);

  useEffect(() => {
    refresh();
  }, [refresh, studentUserId]);

  return { context, loading, error, refresh };
}
