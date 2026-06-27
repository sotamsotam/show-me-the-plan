import type { WeeklyPlanItem } from '@/lib/weekly-plan-item';
import { formatPrepWeekLabel } from '@/lib/exam-countdown';
import type { ExamPrepWeeklyPlansContext } from '@/lib/exam-prep-weekly-plans-context';
import {
  isVisibleRangeInAnyExamPrepWeekPlanPeriod,
  resolveVisiblePrepWeekPlans,
  type VisibleDateRange,
} from '@/lib/exam-prep-visible-week-plans';
import type { VacationWeeklyPlansContext } from '@/lib/vacation-weekly-plans-context';
import {
  isVisibleRangeInAnyVacationPeriod,
  resolveVisibleVacationWeekPlans,
} from '@/lib/vacation-visible-week-plans';
import type { RegularWeeklyPlansContext } from '@/lib/regular-weekly-plans-context';
import {
  isVisibleRangeInAnyRegularPeriod,
  resolveVisibleRegularWeekPlans,
} from '@/lib/regular-visible-week-plans';

export type WeeklyPlanSectionKind = 'exam' | 'vacation' | 'regular';

export interface VisibleWeeklyPlanSubject {
  subjectId: string;
  content: string;
  items?: WeeklyPlanItem[];
}

export interface VisibleWeeklyPlanWeek {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  showWeekLabel: boolean;
  weekLabel: string | null;
  subjects: VisibleWeeklyPlanSubject[];
}

export interface VisibleWeeklyPlanSection {
  kind: WeeklyPlanSectionKind;
  sectionKey: string;
  sectionLabel: string;
  weeks: VisibleWeeklyPlanWeek[];
}

function earliestWeekStart(section: VisibleWeeklyPlanSection): string {
  return section.weeks[0]?.weekStart ?? '';
}

export function isVisibleRangeInAnyWeeklyPlanPeriod(
  range: VisibleDateRange,
  examContext: ExamPrepWeeklyPlansContext,
  vacationContext: VacationWeeklyPlansContext,
  regularContext: RegularWeeklyPlansContext
): boolean {
  return (
    isVisibleRangeInAnyExamPrepWeekPlanPeriod(range, examContext) ||
    isVisibleRangeInAnyVacationPeriod(range, vacationContext.vacationPeriodPreview) ||
    isVisibleRangeInAnyRegularPeriod(range, regularContext.regularPeriodPreview)
  );
}

export function resolveVisibleWeeklyPlanSections(
  range: VisibleDateRange,
  examContext: ExamPrepWeeklyPlansContext,
  vacationContext: VacationWeeklyPlansContext,
  regularContext: RegularWeeklyPlansContext
): VisibleWeeklyPlanSection[] {
  const sections: VisibleWeeklyPlanSection[] = [];

  for (const round of resolveVisiblePrepWeekPlans(range, examContext)) {
    sections.push({
      kind: 'exam',
      sectionKey: round.roundSlot,
      sectionLabel: round.roundLabel ?? round.roundSlot,
      weeks: round.weeks.map((week) => ({
        weekNumber: week.weekNumber,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        showWeekLabel: true,
        weekLabel: formatPrepWeekLabel(week.weekNumber),
        subjects: week.subjects.map((subject) => ({
          subjectId: subject.subjectId,
          content: '',
          items: subject.items,
        })),
      })),
    });
  }

  for (const period of resolveVisibleVacationWeekPlans(range, vacationContext)) {
    sections.push({
      kind: 'vacation',
      sectionKey: period.periodKey,
      sectionLabel: period.periodLabel,
      weeks: period.weeks.map((week) => ({
        weekNumber: week.weekNumber,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        showWeekLabel: false,
        weekLabel: null,
        subjects: week.subjects.map((subject) => ({
          subjectId: subject.subjectId,
          content: '',
          items: subject.items,
        })),
      })),
    });
  }

  for (const period of resolveVisibleRegularWeekPlans(range, regularContext)) {
    sections.push({
      kind: 'regular',
      sectionKey: period.periodKey,
      sectionLabel: period.periodLabel,
      weeks: period.weeks.map((week) => ({
        weekNumber: week.weekNumber,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        showWeekLabel: false,
        weekLabel: null,
        subjects: week.subjects.map((subject) => ({
          subjectId: subject.subjectId,
          content: '',
          items: subject.items,
        })),
      })),
    });
  }

  return sections.sort((left, right) =>
    earliestWeekStart(left).localeCompare(earliestWeekStart(right))
  );
}
