'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStudentApi } from '@/hooks/useStudentApi';
import type { VisibleDateRange } from '@/lib/exam-prep-visible-week-plans';
import {
  formatYmdLocal,
  resolveActiveExamCountdownFromPreview,
  resolveExamPrepPeriodsFromPreview,
  resolveExamPrepWeeksByRound,
  todayYmdLocal,
  type ExamCountdownResult,
  type ExamPrepPeriod,
  type ExamRoundPreviewItem,
} from '@/lib/exam-countdown';
import {
  resolveEffectiveExamRoundPreview,
  resolveExamPeriodSettings,
} from '@/lib/exam-period-settings';

interface ExamCountdownInputs {
  examRoundPreview: ExamRoundPreviewItem[];
  settings: ReturnType<typeof resolveExamPrepWeeksByRound>;
}

interface UseExamCountdownOptions {
  /** When set, D-week is based on the first visible calendar day instead of today. */
  visibleRange?: VisibleDateRange | null;
  /** When set, countdown is based on this YYYYMMDD date instead of today. */
  referenceYmd?: string | null;
}

export function useExamCountdown(options?: UseExamCountdownOptions) {
  const { withStudent, studentUserId } = useStudentApi();
  const [inputs, setInputs] = useState<ExamCountdownInputs | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(withStudent('/api/profile/exam-prep-settings'), {
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        setInputs(null);
        return;
      }

      const settings = resolveExamPrepWeeksByRound(
        data.examPrepWeeksByRound,
        data.examPrepWeeksBefore
      );
      const examPeriodSettings = resolveExamPeriodSettings(data.examPeriodSettings);
      const examRoundPreview = resolveEffectiveExamRoundPreview(
        examPeriodSettings,
        (data.examRoundPreview ?? []) as ExamRoundPreviewItem[]
      );

      setInputs({ examRoundPreview, settings });
    } catch {
      setInputs(null);
    }
  }, [withStudent]);

  useEffect(() => {
    refresh();
  }, [refresh, studentUserId]);

  const referenceYmd = useMemo(() => {
    if (options?.referenceYmd) {
      return options.referenceYmd;
    }

    if (options?.visibleRange) {
      return formatYmdLocal(options.visibleRange.start);
    }

    return todayYmdLocal();
  }, [options?.referenceYmd, options?.visibleRange]);

  const countdown = useMemo((): ExamCountdownResult | null => {
    if (!inputs) {
      return null;
    }

    return resolveActiveExamCountdownFromPreview(
      inputs.examRoundPreview,
      inputs.settings,
      referenceYmd
    );
  }, [inputs, referenceYmd]);

  const examPrepPeriods = useMemo((): ExamPrepPeriod[] => {
    if (!inputs) {
      return [];
    }

    return resolveExamPrepPeriodsFromPreview(inputs.examRoundPreview, inputs.settings);
  }, [inputs]);

  return { countdown, examPrepPeriods, refresh };
}
