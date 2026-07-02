import { normalizeTime } from '@/lib/schedule-time';
import {
  resolveOccurrenceFields,
  type ScheduleOccurrenceOverride,
  type UserSchedule,
} from '@/lib/user-schedule';

function parseIsoDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function normalizeExcludedDates(dates: string[]): string[] {
  return Array.from(new Set(dates.map((date) => date.slice(0, 10)))).sort();
}

function isValidOccurrenceDate(schedule: UserSchedule, date: string): boolean {
  if (schedule.recurrenceType !== 'weekly' || !schedule.validFrom || !schedule.validUntil) {
    return false;
  }

  if (date < schedule.validFrom || date > schedule.validUntil) {
    return false;
  }

  return schedule.daysOfWeek.includes(parseIsoDate(date).getDay());
}

function hasActiveOccurrenceOnDate(schedule: UserSchedule, date: string): boolean {
  if (schedule.excludedDates.includes(date)) {
    return false;
  }

  if (schedule.overrides[date]) {
    return true;
  }

  return isValidOccurrenceDate(schedule, date);
}

export function validateOccurrenceMoveTarget(
  schedule: UserSchedule,
  fromDate: string,
  toDate: string
): string | null {
  if (fromDate === toDate) {
    return null;
  }

  if (!schedule.validFrom || !schedule.validUntil) {
    return '반복 기간이 없습니다.';
  }

  if (toDate < schedule.validFrom || toDate > schedule.validUntil) {
    return '반복 기간 밖 날짜로는 이동할 수 없습니다.';
  }

  if (hasActiveOccurrenceOnDate(schedule, toDate)) {
    return '해당 날짜에 이미 일정이 있습니다.';
  }

  return null;
}

export function buildOccurrenceMoveUpdate(
  schedule: UserSchedule,
  fromDate: string,
  toDate: string,
  input: ScheduleOccurrenceOverride
): { excludedDates: string[]; overrides: Record<string, ScheduleOccurrenceOverride> } {
  const overrides = { ...schedule.overrides };
  delete overrides[fromDate];

  let excludedDates = [...schedule.excludedDates];

  if (isValidOccurrenceDate(schedule, fromDate)) {
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

export function buildWeeklyScheduleMovePayload(
  schedule: UserSchedule,
  fromDate: string,
  toDate: string,
  input: ScheduleOccurrenceOverride
) {
  const { excludedDates, overrides } = buildOccurrenceMoveUpdate(
    schedule,
    fromDate,
    toDate,
    input
  );

  return {
    title: schedule.title,
    scheduleCategory: schedule.scheduleCategory,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    recurrenceType: 'weekly' as const,
    daysOfWeek: schedule.daysOfWeek,
    validFrom: schedule.validFrom ?? undefined,
    validUntil: schedule.validUntil ?? undefined,
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
  schedule: UserSchedule,
  fromDate: string,
  toDate: string,
  startTime: string,
  endTime: string,
  title?: string
): OccurrenceDetachRequest {
  const fields = resolveOccurrenceFields(schedule, fromDate);

  return {
    toDate,
    title: title?.trim() || fields.title,
    startTime,
    endTime,
  };
}
