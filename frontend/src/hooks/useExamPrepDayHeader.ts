'use client';

import type { DayHeaderContentArg } from '@fullcalendar/core';
import { useMemo } from 'react';
import {
  formatYmdLocal,
  isDateInExamPrepPeriod,
  resolveExamPrepDaysRemaining,
  type ExamPrepPeriod,
} from '@/lib/exam-countdown';
import {
  DAY_HEADER_PERIOD_CLASS_NAMES,
  isDateInVacationPeriod,
  type DayHeaderPeriodKind,
  type VacationPeriod,
} from '@/lib/school-term-periods';

function resolveDayHeaderPeriodKind(
  ymd: string,
  examPrepPeriods: ExamPrepPeriod[],
  vacationPeriods: VacationPeriod[]
): DayHeaderPeriodKind {
  if (isDateInExamPrepPeriod(ymd, examPrepPeriods)) {
    return 'exam';
  }

  if (isDateInVacationPeriod(ymd, vacationPeriods)) {
    return 'vacation';
  }

  return 'term';
}

export function useExamPrepDayHeader(
  examPrepPeriods: ExamPrepPeriod[],
  vacationPeriods: VacationPeriod[] = []
) {
  const dayHeaderClassNames = useMemo(
    () => (arg: { date: Date }) => {
      const ymd = formatYmdLocal(arg.date);
      const kind = resolveDayHeaderPeriodKind(ymd, examPrepPeriods, vacationPeriods);
      return [DAY_HEADER_PERIOD_CLASS_NAMES[kind]];
    },
    [examPrepPeriods, vacationPeriods]
  );

  const dayHeaderContent = useMemo(
    () => (arg: DayHeaderContentArg) => {
      const isListView = arg.view.type.startsWith('list');
      const daysRemaining = resolveExamPrepDaysRemaining(
        formatYmdLocal(arg.date),
        examPrepPeriods
      );
      const ddayMarkup =
        daysRemaining === null
          ? ''
          : `<span class="fc-exam-prep-dday">D-${daysRemaining}</span>`;

      if (isListView) {
        const sideText = String((arg as { sideText?: string }).sideText ?? '');

        return {
          html: `<a class="fc-list-day-text">${arg.text}</a><a class="fc-list-day-side-text" aria-hidden="true">${sideText}${ddayMarkup}</a>`,
        };
      }

      if (daysRemaining === null) {
        return { html: arg.text };
      }

      return {
        html: `${arg.text}${ddayMarkup}`,
      };
    },
    [examPrepPeriods]
  );

  return { dayHeaderClassNames, dayHeaderContent };
}
