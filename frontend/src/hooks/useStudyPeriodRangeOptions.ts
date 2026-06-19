'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStudentApi } from '@/hooks/useStudentApi';
import {
  resolveEffectiveExamRoundPreview,
  resolveExamPeriodSettings,
} from '@/lib/exam-period-settings';
import {
  resolveExamPrepWeeksByRound,
  type ExamRoundPreviewItem,
} from '@/lib/exam-countdown';
import {
  buildStudyPeriodRangeOptions,
  type StudyPeriodRangeOption,
} from '@/lib/study-period-range-options';
import {
  resolveVacationPeriodSettings,
} from '@/lib/vacation-period-settings';

export function useStudyPeriodRangeOptions() {
  const { withStudent, studentUserId } = useStudentApi();
  const [options, setOptions] = useState<StudyPeriodRangeOption[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const [examRes, vacationRes] = await Promise.all([
        fetch(withStudent('/api/profile/exam-prep-settings'), { credentials: 'include' }),
        fetch(withStudent('/api/profile/vacation-period-settings'), {
          credentials: 'include',
        }),
      ]);

      const examData = await examRes.json();
      const vacationData = await vacationRes.json();

      if (!examRes.ok || !vacationRes.ok) {
        setOptions([]);
        return;
      }

      const examPrepWeeksByRound = resolveExamPrepWeeksByRound(
        examData.examPrepWeeksByRound,
        examData.examPrepWeeksBefore
      );
      const examPeriodSettings = resolveExamPeriodSettings(examData.examPeriodSettings);
      const examRoundPreview = resolveEffectiveExamRoundPreview(
        examPeriodSettings,
        (examData.examRoundPreview ?? []) as ExamRoundPreviewItem[]
      );
      const vacationPeriodSettings = resolveVacationPeriodSettings(
        vacationData.vacationPeriodSettings
      );

      setOptions(
        buildStudyPeriodRangeOptions({
          vacationPeriodSettings,
          examRoundPreview,
          examPrepWeeksByRound,
        })
      );
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [withStudent]);

  useEffect(() => {
    refresh();
  }, [refresh, studentUserId]);

  return { options, loading };
}
