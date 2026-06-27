import {
  EXAM_ROUND_LABELS,
  EXAM_ROUND_SLOTS,
  formatYmdLocal,
  getWeeksForSlot,
  resolveExamPrepWeekPeriod,
  resolveExamPrepWeekPlanPeriodBounds,
  resolvePrepWeekDateRange,
  type ExamRoundSlot,
} from '@/lib/exam-countdown';
import {
  getUnscheduledExamPrepWeeklyPlanItems,
  type ExamPrepWeeklyPlanItem,
} from '@/lib/exam-prep-weekly-plan';
import type { ExamPrepWeeklyPlansContext } from '@/lib/exam-prep-weekly-plans-context';
import type { UserSubject } from '@/lib/user-subject';

export interface VisiblePrepWeekPlanSubject {
  subjectId: string;
  items: ExamPrepWeeklyPlanItem[];
}

export interface VisiblePrepWeekPlanWeek {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  subjects: VisiblePrepWeekPlanSubject[];
}

export interface VisiblePrepWeekPlanRound {
  roundSlot: ExamRoundSlot;
  roundLabel: string | null;
  weeks: VisiblePrepWeekPlanWeek[];
}

/** FullCalendar `datesSet` range (`end` is exclusive). */
export interface VisibleDateRange {
  start: Date;
  end: Date;
}

function toInclusiveYmdRange(range: VisibleDateRange): { start: string; end: string } {
  const start = formatYmdLocal(range.start);
  const lastVisible = new Date(range.end);
  lastVisible.setDate(lastVisible.getDate() - 1);

  return {
    start,
    end: formatYmdLocal(lastVisible),
  };
}

function rangesOverlapInclusive(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

function orderSubjectIds(subjectIds: string[], subjects: UserSubject[]): string[] {
  const order = new Map(subjects.map((subject, index) => [subject.id, index]));

  return [...subjectIds].sort((left, right) => {
    const leftOrder = order.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.localeCompare(right);
  });
}

function isVisibleRangeInExamPrepWeekPlanPeriod(
  visible: { start: string; end: string },
  examFirstDay: string,
  weeksBefore: number
): boolean {
  const { prepStart, lastPrepDay } = resolveExamPrepWeekPlanPeriodBounds(
    examFirstDay,
    weeksBefore
  );

  return rangesOverlapInclusive(visible.start, visible.end, prepStart, lastPrepDay);
}

export function isVisibleRangeInAnyExamPrepWeekPlanPeriod(
  range: VisibleDateRange,
  context: ExamPrepWeeklyPlansContext
): boolean {
  const visible = toInclusiveYmdRange(range);

  for (const roundSlot of EXAM_ROUND_SLOTS) {
    const preview = context.examRoundPreview.find((item) => item.slot === roundSlot);
    if (!preview?.hasSchedule || !preview.firstDay) {
      continue;
    }

    const weeksBefore = getWeeksForSlot(roundSlot, context.examPrepWeeksByRound);
    if (isVisibleRangeInExamPrepWeekPlanPeriod(visible, preview.firstDay, weeksBefore)) {
      return true;
    }
  }

  return false;
}

export function resolveVisiblePrepWeekPlans(
  range: VisibleDateRange,
  context: ExamPrepWeeklyPlansContext
): VisiblePrepWeekPlanRound[] {
  const visible = toInclusiveYmdRange(range);
  const results: VisiblePrepWeekPlanRound[] = [];

  for (const roundSlot of EXAM_ROUND_SLOTS) {
    const roundPlan = context.plans[roundSlot];
    if (!roundPlan?.weeks) {
      continue;
    }

    const preview = context.examRoundPreview.find((item) => item.slot === roundSlot);
    if (!preview?.hasSchedule || !preview.firstDay) {
      continue;
    }

    const weeksBefore = getWeeksForSlot(roundSlot, context.examPrepWeeksByRound);
    if (
      !isVisibleRangeInExamPrepWeekPlanPeriod(visible, preview.firstDay, weeksBefore)
    ) {
      continue;
    }

    const period = resolveExamPrepWeekPeriod(preview.firstDay, weeksBefore);

    const visibleWeeks: VisiblePrepWeekPlanWeek[] = [];

    for (const [weekKey, weekSubjects] of Object.entries(roundPlan.weeks)) {
      const weekNumber = Number(weekKey);
      if (!Number.isInteger(weekNumber) || !weekSubjects) {
        continue;
      }

      const weekRange = resolvePrepWeekDateRange(period, weekNumber, weeksBefore);
      if (!weekRange) {
        continue;
      }

      if (
        !rangesOverlapInclusive(
          visible.start,
          visible.end,
          weekRange.start,
          weekRange.end
        )
      ) {
        continue;
      }

      const subjects: VisiblePrepWeekPlanSubject[] = [];

      for (const subjectId of orderSubjectIds(Object.keys(weekSubjects), context.subjects)) {
        const items = getUnscheduledExamPrepWeeklyPlanItems(
          weekSubjects[subjectId] ?? []
        );

        if (items.length > 0) {
          subjects.push({ subjectId, items });
        }
      }

      if (subjects.length === 0) {
        continue;
      }

      visibleWeeks.push({
        weekNumber,
        weekStart: weekRange.start,
        weekEnd: weekRange.end,
        subjects,
      });
    }

    if (visibleWeeks.length === 0) {
      continue;
    }

    visibleWeeks.sort((left, right) => left.weekStart.localeCompare(right.weekStart));

    results.push({
      roundSlot,
      roundLabel: preview.label ?? EXAM_ROUND_LABELS[roundSlot],
      weeks: visibleWeeks,
    });
  }

  return results;
}
