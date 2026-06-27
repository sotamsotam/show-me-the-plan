import type { ExamRoundSlot } from '@/lib/exam-countdown';
import { parseEventDateTimeRange } from '@/lib/calendar-event-range';
import type { StudyPlanTodoFormInitial } from '@/components/StudyPlanTodoForm';
import type { StudyPlanTodoInput } from '@/lib/study-plan-todo';
import type { VacationPeriodSlot } from '@/lib/vacation-period-settings';
import type { WeeklyPlanSource } from '@/lib/weekly-plan-source';

interface WeeklyPlanPlacementBase {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  subjectId: string;
  itemId: string;
  title: string;
}

export interface ExamPrepWeeklyPlanPlacementContext extends WeeklyPlanPlacementBase {
  kind: 'exam-prep';
  roundSlot: ExamRoundSlot;
}

export interface VacationWeeklyPlanPlacementContext extends WeeklyPlanPlacementBase {
  kind: 'vacation';
  periodSlot: VacationPeriodSlot;
}

export interface RegularWeeklyPlanPlacementContext extends WeeklyPlanPlacementBase {
  kind: 'regular';
  periodKey: string;
}

export type WeeklyPlanPlacementContext =
  | ExamPrepWeeklyPlanPlacementContext
  | VacationWeeklyPlanPlacementContext
  | RegularWeeklyPlanPlacementContext;

export function isYmdInInclusiveRange(
  ymd: string,
  rangeStart: string,
  rangeEnd: string
): boolean {
  const normalized = ymd.replace(/-/g, '');
  const start = rangeStart.replace(/-/g, '');
  const end = rangeEnd.replace(/-/g, '');
  return normalized >= start && normalized <= end;
}

export function formatTimeInput(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function buildWeeklyPlanPlacementFormInitial(
  start: Date,
  end: Date,
  placement: WeeklyPlanPlacementContext
): StudyPlanTodoFormInitial {
  const calendarDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

  return {
    subject: placement.subjectId as StudyPlanTodoFormInitial['subject'],
    title: placement.title,
    recurrenceType: 'once',
    date: calendarDate,
    startTime: formatTimeInput(start),
    endTime: formatTimeInput(end),
  };
}

export function buildWeeklyPlanSource(placement: WeeklyPlanPlacementContext): WeeklyPlanSource {
  if (placement.kind === 'vacation') {
    return {
      kind: 'vacation',
      periodSlot: placement.periodSlot,
      weekNumber: placement.weekNumber,
      subjectId: placement.subjectId,
      itemId: placement.itemId,
    };
  }

  if (placement.kind === 'regular') {
    return {
      kind: 'regular',
      periodKey: placement.periodKey,
      weekNumber: placement.weekNumber,
      subjectId: placement.subjectId,
      itemId: placement.itemId,
    };
  }

  return {
    kind: 'exam-prep',
    roundSlot: placement.roundSlot,
    weekNumber: placement.weekNumber,
    subjectId: placement.subjectId,
    itemId: placement.itemId,
  };
}

export function buildWeeklyPlanTodoCreatePayload(
  placement: WeeklyPlanPlacementContext,
  start: Date,
  end: Date
): StudyPlanTodoInput {
  const { date, startTime, endTime } = parseEventDateTimeRange(start, end);

  return {
    subject: placement.subjectId as StudyPlanTodoInput['subject'],
    title: placement.title,
    recurrenceType: 'once',
    date,
    startTime,
    endTime,
    weeklyPlanSource: buildWeeklyPlanSource(placement),
  };
}

export function readWeeklyPlanPlacementFromElement(
  element: HTMLElement
): WeeklyPlanPlacementContext | null {
  const weekNumber = Number(element.dataset.weeklyPlanWeekNumber);
  const weekStart = element.dataset.weeklyPlanWeekStart;
  const weekEnd = element.dataset.weeklyPlanWeekEnd;
  const subjectId = element.dataset.weeklyPlanSubjectId;
  const itemId = element.dataset.weeklyPlanItemId;
  const title = element.dataset.weeklyPlanItemTitle;
  const roundSlot = element.dataset.weeklyPlanRoundSlot;
  const periodSlot = element.dataset.weeklyPlanPeriodSlot;
  const regularPeriodKey = element.dataset.weeklyPlanRegularPeriodKey;

  if (
    !Number.isInteger(weekNumber) ||
    weekNumber < 1 ||
    !weekStart ||
    !weekEnd ||
    !subjectId ||
    !itemId ||
    !title
  ) {
    return null;
  }

  const base = {
    weekNumber,
    weekStart,
    weekEnd,
    subjectId,
    itemId,
    title,
  };

  if (periodSlot === 'summer' || periodSlot === 'winter') {
    return {
      kind: 'vacation',
      periodSlot,
      ...base,
    };
  }

  if (regularPeriodKey) {
    return {
      kind: 'regular',
      periodKey: regularPeriodKey,
      ...base,
    };
  }

  if (roundSlot) {
    return {
      kind: 'exam-prep',
      roundSlot: roundSlot as ExamRoundSlot,
      ...base,
    };
  }

  return null;
}
