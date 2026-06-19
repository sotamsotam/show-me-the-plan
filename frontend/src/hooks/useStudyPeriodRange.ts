'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStudentApi } from '@/hooks/useStudentApi';
import { useStudyPeriodRangeOptions } from '@/hooks/useStudyPeriodRangeOptions';
import {
  resolveDefaultStudyPeriodRange,
  studyPeriodRangeToIsoRange,
} from '@/lib/study-period-range-options';
import { getLast7DaysRange, isValidDateRange } from '@/lib/study-stats';

export function useStudyPeriodRange() {
  const { studentUserId } = useStudentApi();
  const { options: periodOptions, loading: periodOptionsLoading } = useStudyPeriodRangeOptions();
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [selectedPeriodKey, setSelectedPeriodKey] = useState('');
  const manualRangeRef = useRef(false);

  const rangeError = useMemo(() => {
    if (!rangeStart || !rangeEnd) {
      return '시작일과 종료일을 입력해 주세요.';
    }

    if (!isValidDateRange(rangeStart, rangeEnd)) {
      return '시작일은 종료일보다 이후일 수 없습니다.';
    }

    return '';
  }, [rangeStart, rangeEnd]);

  const showRangeError =
    Boolean(rangeError) && !(periodOptionsLoading && !rangeStart && !rangeEnd);

  const handlePeriodSelect = useCallback(
    (periodKey: string) => {
      manualRangeRef.current = true;
      setSelectedPeriodKey(periodKey);

      if (!periodKey) {
        return;
      }

      const option = periodOptions.find((item) => item.key === periodKey);
      if (!option) {
        return;
      }

      const { start, end } = studyPeriodRangeToIsoRange(option);
      setRangeStart(start);
      setRangeEnd(end);
    },
    [periodOptions]
  );

  const handleRangeStartChange = useCallback((value: string) => {
    manualRangeRef.current = true;
    setRangeStart(value);
    setSelectedPeriodKey('');
  }, []);

  const handleRangeEndChange = useCallback((value: string) => {
    manualRangeRef.current = true;
    setRangeEnd(value);
    setSelectedPeriodKey('');
  }, []);

  useEffect(() => {
    manualRangeRef.current = false;
  }, [studentUserId]);

  useEffect(() => {
    if (periodOptionsLoading || manualRangeRef.current) {
      return;
    }

    const defaultRange = resolveDefaultStudyPeriodRange(periodOptions);
    if (defaultRange) {
      setSelectedPeriodKey(defaultRange.periodKey);
      setRangeStart(defaultRange.start);
      setRangeEnd(defaultRange.end);
      return;
    }

    const fallbackRange = getLast7DaysRange();
    setSelectedPeriodKey('');
    setRangeStart(fallbackRange.start);
    setRangeEnd(fallbackRange.end);
  }, [periodOptions, periodOptionsLoading, studentUserId]);

  return {
    rangeStart,
    rangeEnd,
    rangeError,
    showRangeError,
    selectedPeriodKey,
    periodOptions,
    periodOptionsLoading,
    handlePeriodSelect,
    handleRangeStartChange,
    handleRangeEndChange,
  };
}
