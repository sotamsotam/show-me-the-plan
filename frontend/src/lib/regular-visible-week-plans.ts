import { formatYmdLocal } from '@/lib/exam-countdown';
import type { RegularPeriodSegmentPreviewItem } from '@/lib/regular-period-segments';
import {
  getRegularWeeklyPlanItems,
  getUnscheduledRegularWeeklyPlanItems,
  previewItemToRegularPeriodFromPreview,
  type RegularWeeklyPlanItem,
  type RegularWeeklyPlans,
} from '@/lib/regular-weekly-plan';
import type { RegularWeeklyPlansContext } from '@/lib/regular-weekly-plans-context';
import { resolveVacationWeekDateRange } from '@/lib/vacation-week-date-range';
import type { UserSubject } from '@/lib/user-subject';
import type { VisibleDateRange } from '@/lib/exam-prep-visible-week-plans';

export interface VisibleRegularWeekPlanSubject {
  subjectId: string;
  items: RegularWeeklyPlanItem[];
}

export interface VisibleRegularWeekPlanWeek {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  subjects: VisibleRegularWeekPlanSubject[];
}

export interface VisibleRegularWeekPlanPeriod {
  periodKey: string;
  periodLabel: string;
  weeks: VisibleRegularWeekPlanWeek[];
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

export function isVisibleRangeInAnyRegularPeriod(
  range: VisibleDateRange,
  preview: RegularPeriodSegmentPreviewItem[]
): boolean {
  const visible = toInclusiveYmdRange(range);

  return preview.some((period) =>
    rangesOverlapInclusive(visible.start, visible.end, period.start, period.end)
  );
}

export function resolveVisibleRegularWeekPlans(
  range: VisibleDateRange,
  context: RegularWeeklyPlansContext
): VisibleRegularWeekPlanPeriod[] {
  const visible = toInclusiveYmdRange(range);
  const results: VisibleRegularWeekPlanPeriod[] = [];

  for (const preview of context.regularPeriodPreview) {
    if (!rangesOverlapInclusive(visible.start, visible.end, preview.start, preview.end)) {
      continue;
    }

    const periodPlan = context.plans[preview.periodKey];
    if (!periodPlan?.weeks) {
      continue;
    }

    const period = previewItemToRegularPeriodFromPreview(preview);
    const visibleWeeks: VisibleRegularWeekPlanWeek[] = [];

    for (const [weekKey, weekSubjects] of Object.entries(periodPlan.weeks)) {
      const weekNumber = Number(weekKey);
      if (!Number.isInteger(weekNumber) || !weekSubjects) {
        continue;
      }

      const weekRange = resolveVacationWeekDateRange(period, weekNumber);
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

      const subjects: VisibleRegularWeekPlanSubject[] = [];

      for (const subjectId of orderSubjectIds(Object.keys(weekSubjects), context.subjects)) {
        const items = getUnscheduledRegularWeeklyPlanItems(
          getRegularWeeklyPlanItems(context.plans, preview.periodKey, weekNumber, subjectId)
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
      periodKey: preview.periodKey,
      periodLabel: preview.label,
      weeks: visibleWeeks,
    });
  }

  return results;
}
