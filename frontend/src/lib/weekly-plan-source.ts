import { EXAM_ROUND_SLOTS, type ExamRoundSlot } from '@/lib/exam-countdown';
import type { VacationPeriodSlot } from '@/lib/vacation-period-settings';

export interface ExamPrepWeeklyPlanSource {
  kind: 'exam-prep';
  roundSlot: ExamRoundSlot;
  weekNumber: number;
  subjectId: string;
  itemId: string;
}

export interface VacationWeeklyPlanSource {
  kind: 'vacation';
  periodSlot: VacationPeriodSlot;
  weekNumber: number;
  subjectId: string;
  itemId: string;
}

export interface RegularWeeklyPlanSource {
  kind: 'regular';
  periodKey: string;
  weekNumber: number;
  subjectId: string;
  itemId: string;
}

export type WeeklyPlanSource =
  | ExamPrepWeeklyPlanSource
  | VacationWeeklyPlanSource
  | RegularWeeklyPlanSource;

const EXAM_ROUND_SLOT_SET = new Set<string>(EXAM_ROUND_SLOTS);
const VACATION_PERIOD_SLOT_SET = new Set<string>(['summer', 'winter']);

export function isExamPrepWeeklyPlanSource(value: unknown): value is ExamPrepWeeklyPlanSource {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    record.kind === 'exam-prep' &&
    typeof record.roundSlot === 'string' &&
    EXAM_ROUND_SLOT_SET.has(record.roundSlot) &&
    typeof record.weekNumber === 'number' &&
    Number.isInteger(record.weekNumber) &&
    record.weekNumber >= 1 &&
    typeof record.subjectId === 'string' &&
    record.subjectId.trim().length > 0 &&
    typeof record.itemId === 'string' &&
    record.itemId.trim().length > 0
  );
}

export function isVacationWeeklyPlanSource(value: unknown): value is VacationWeeklyPlanSource {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    record.kind === 'vacation' &&
    typeof record.periodSlot === 'string' &&
    VACATION_PERIOD_SLOT_SET.has(record.periodSlot) &&
    typeof record.weekNumber === 'number' &&
    Number.isInteger(record.weekNumber) &&
    record.weekNumber >= 1 &&
    typeof record.subjectId === 'string' &&
    record.subjectId.trim().length > 0 &&
    typeof record.itemId === 'string' &&
    record.itemId.trim().length > 0
  );
}

function isValidRegularPeriodKey(value: string): boolean {
  return /^[a-z0-9-]+$/.test(value) && value.length > 0 && value.length <= 80;
}

export function isRegularWeeklyPlanSource(value: unknown): value is RegularWeeklyPlanSource {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    record.kind === 'regular' &&
    typeof record.periodKey === 'string' &&
    isValidRegularPeriodKey(record.periodKey) &&
    typeof record.weekNumber === 'number' &&
    Number.isInteger(record.weekNumber) &&
    record.weekNumber >= 1 &&
    typeof record.subjectId === 'string' &&
    record.subjectId.trim().length > 0 &&
    typeof record.itemId === 'string' &&
    record.itemId.trim().length > 0
  );
}

export function normalizeWeeklyPlanSource(value: unknown): WeeklyPlanSource | null {
  if (isExamPrepWeeklyPlanSource(value)) {
    return {
      kind: 'exam-prep',
      roundSlot: value.roundSlot,
      weekNumber: value.weekNumber,
      subjectId: value.subjectId.trim(),
      itemId: value.itemId.trim(),
    };
  }

  if (isVacationWeeklyPlanSource(value)) {
    return {
      kind: 'vacation',
      periodSlot: value.periodSlot,
      weekNumber: value.weekNumber,
      subjectId: value.subjectId.trim(),
      itemId: value.itemId.trim(),
    };
  }

  if (isRegularWeeklyPlanSource(value)) {
    return {
      kind: 'regular',
      periodKey: value.periodKey,
      weekNumber: value.weekNumber,
      subjectId: value.subjectId.trim(),
      itemId: value.itemId.trim(),
    };
  }

  return null;
}
