import { normalizeTime } from '@/lib/schedule-time';
import {
  resolveOccurrenceFields,
  type StudyPlanOccurrenceOverride,
  type StudyPlanTodo,
} from '@/lib/study-plan-todo';

function parseIsoDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function normalizeExcludedDates(dates: string[]): string[] {
  return Array.from(new Set(dates.map((date) => date.slice(0, 10)))).sort();
}

function isValidOccurrenceDate(todo: StudyPlanTodo, date: string): boolean {
  if (todo.recurrenceType !== 'weekly' || !todo.validFrom || !todo.validUntil) {
    return false;
  }

  if (date < todo.validFrom || date > todo.validUntil) {
    return false;
  }

  return todo.daysOfWeek.includes(parseIsoDate(date).getDay());
}

function hasActiveOccurrenceOnDate(todo: StudyPlanTodo, date: string): boolean {
  if (todo.excludedDates.includes(date)) {
    return false;
  }

  if (todo.overrides[date]) {
    return true;
  }

  return isValidOccurrenceDate(todo, date);
}

export function validateOccurrenceMoveTarget(
  todo: StudyPlanTodo,
  fromDate: string,
  toDate: string
): string | null {
  if (fromDate === toDate) {
    return null;
  }

  if (!todo.validFrom || !todo.validUntil) {
    return '반복 기간이 없습니다.';
  }

  if (toDate < todo.validFrom || toDate > todo.validUntil) {
    return '반복 기간 밖 날짜로는 이동할 수 없습니다.';
  }

  if (hasActiveOccurrenceOnDate(todo, toDate)) {
    return '해당 날짜에 이미 스터디 플랜이 있습니다.';
  }

  return null;
}

export function buildOccurrenceMoveUpdate(
  todo: StudyPlanTodo,
  fromDate: string,
  toDate: string,
  input: StudyPlanOccurrenceOverride
): { excludedDates: string[]; overrides: Record<string, StudyPlanOccurrenceOverride> } {
  const overrides = { ...todo.overrides };
  delete overrides[fromDate];

  let excludedDates = [...todo.excludedDates];

  if (isValidOccurrenceDate(todo, fromDate)) {
    excludedDates = normalizeExcludedDates([...excludedDates, fromDate]);
  } else {
    excludedDates = excludedDates.filter((value) => value !== fromDate);
  }

  excludedDates = excludedDates.filter((value) => value !== toDate);

  overrides[toDate] = {
    title: input.title.trim(),
    startTime: normalizeTime(input.startTime),
    endTime: normalizeTime(input.endTime),
  };

  return {
    excludedDates: normalizeExcludedDates(excludedDates),
    overrides,
  };
}

export function buildWeeklyTodoMovePayload(
  todo: StudyPlanTodo,
  fromDate: string,
  toDate: string,
  input: StudyPlanOccurrenceOverride
) {
  const { excludedDates, overrides } = buildOccurrenceMoveUpdate(
    todo,
    fromDate,
    toDate,
    input
  );

  return {
    subject: todo.subject,
    title: todo.title,
    startTime: todo.startTime,
    endTime: todo.endTime,
    recurrenceType: 'weekly' as const,
    daysOfWeek: todo.daysOfWeek,
    validFrom: todo.validFrom ?? undefined,
    validUntil: todo.validUntil ?? undefined,
    excludedDates,
    overrides,
  };
}

export interface OccurrenceDetachRequest {
  toDate: string;
  title: string;
  startTime: string;
  endTime: string;
}

export function buildOccurrenceDetachRequest(
  todo: StudyPlanTodo,
  fromDate: string,
  toDate: string,
  startTime: string,
  endTime: string,
  title?: string
): OccurrenceDetachRequest {
  const fields = resolveOccurrenceFields(todo, fromDate);

  return {
    toDate,
    title: title?.trim() || fields.title,
    startTime,
    endTime,
  };
}
