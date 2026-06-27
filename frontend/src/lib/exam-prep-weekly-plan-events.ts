import type { EventInput } from '@fullcalendar/core';
import {
  EXAM_ROUND_SLOTS,
  getWeeksForSlot,
  resolveExamPrepWeekPeriod,
  resolvePrepWeekDateRange,
  type ExamPrepWeeksByRound,
  type ExamRoundPreviewItem,
  type ExamRoundSlot,
} from '@/lib/exam-countdown';
import {
  getUnscheduledExamPrepWeeklyPlanItems,
  type ExamPrepWeeklyPlans,
} from '@/lib/exam-prep-weekly-plan';
import { EXAM_PREP_MEMO_EVENT_TYPE } from '@/lib/exam-prep-memo';
import { subjectClassName } from '@/lib/calendar-design-tokens';
import { enrichCalendarEventWithSubjectColor } from '@/lib/subject-color';
import { ymdToIsoDate } from '@/lib/period-times';
import { getSubjectLabel, type UserSubject } from '@/lib/user-subject';

export { EXAM_PREP_MEMO_EVENT_TYPE, isExamPrepMemoEvent } from '@/lib/exam-prep-memo';

export interface BuildExamPrepWeeklyPlanEventsInput {
  plans: ExamPrepWeeklyPlans;
  examPrepWeeksByRound: ExamPrepWeeksByRound;
  examRoundPreview: ExamRoundPreviewItem[];
  subjects: UserSubject[];
}

function addDaysYmd(ymd: string, days: number): string {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6)) - 1;
  const day = Number(ymd.slice(6, 8));
  const date = new Date(year, month, day);
  date.setDate(date.getDate() + days);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function buildExamPrepMemoEventId(
  roundSlot: ExamRoundSlot,
  weekNumber: number,
  subjectId: string,
  itemId: string
): string {
  return `exam-prep-memo-${roundSlot}-${weekNumber}-${subjectId}-${itemId}`;
}

export function buildExamPrepWeeklyPlanEvents(
  input: BuildExamPrepWeeklyPlanEventsInput
): EventInput[] {
  const events: EventInput[] = [];

  for (const roundSlot of EXAM_ROUND_SLOTS) {
    const roundPlan = input.plans[roundSlot];
    if (!roundPlan?.weeks) {
      continue;
    }

    const preview = input.examRoundPreview.find((item) => item.slot === roundSlot);
    if (!preview?.hasSchedule || !preview.firstDay) {
      continue;
    }

    const weeksBefore = getWeeksForSlot(roundSlot, input.examPrepWeeksByRound);
    const period = resolveExamPrepWeekPeriod(preview.firstDay, weeksBefore);

    for (const [weekKey, weekSubjects] of Object.entries(roundPlan.weeks)) {
      const weekNumber = Number(weekKey);
      if (!Number.isInteger(weekNumber) || !weekSubjects) {
        continue;
      }

      const range = resolvePrepWeekDateRange(period, weekNumber, weeksBefore);
      if (!range) {
        continue;
      }

      for (const [subjectId, items] of Object.entries(weekSubjects)) {
        for (const item of getUnscheduledExamPrepWeeklyPlanItems(items ?? [])) {
          const subjectLabel = getSubjectLabel(subjectId, input.subjects);

          events.push(
            enrichCalendarEventWithSubjectColor(
              {
                id: buildExamPrepMemoEventId(roundSlot, weekNumber, subjectId, item.id),
                title: `[${subjectLabel}] ${item.title}`,
                start: ymdToIsoDate(range.start),
                end: ymdToIsoDate(addDaysYmd(range.end, 1)),
                allDay: true,
                editable: false,
                startEditable: false,
                durationEditable: false,
                classNames: [
                  'exam-prep-memo-event',
                  'cal-event-card',
                  subjectClassName(subjectId, input.subjects),
                ],
                extendedProps: {
                  type: EXAM_PREP_MEMO_EVENT_TYPE,
                  roundSlot,
                  weekNumber,
                  subjectId,
                  itemId: item.id,
                  content: item.title,
                  weekStart: range.start,
                  weekEnd: range.end,
                },
              },
              subjectId,
              input.subjects
            )
          );
        }
      }
    }
  }

  return events.sort((left, right) => {
    const leftStart = String(left.start);
    const rightStart = String(right.start);

    if (leftStart !== rightStart) {
      return leftStart.localeCompare(rightStart);
    }

    return String(left.title).localeCompare(String(right.title));
  });
}
