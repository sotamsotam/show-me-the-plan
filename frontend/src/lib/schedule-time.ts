/**
 * Schedule time helpers aligned with the app study-day model (05:00–04:00).
 * Keep in sync with backend/src/services/schedule-time.ts.
 */

export const DAY_ANCHOR_MINUTES = 5 * 60;

/** Placeholder times stored for all-day schedules (validation skipped when allDay is true). */
export const ALL_DAY_START_TIME = '00:00';
export const ALL_DAY_END_TIME = '00:00';

export const MAX_CROSS_MIDNIGHT_END_MINUTES = 4 * 60;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function normalizeTime(value: string): string {
  return value.trim().slice(0, 5);
}

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(normalizeTime(value));
}

function parseWallClockMinutes(time: string): number {
  const normalized = normalizeTime(time);
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
}

export function toDayOffsetMinutes(time: string): number {
  const total = parseWallClockMinutes(time);

  if (total >= DAY_ANCHOR_MINUTES) {
    return total - DAY_ANCHOR_MINUTES;
  }

  return total + (24 * 60 - DAY_ANCHOR_MINUTES);
}

export function isoToDayOffset(iso: string): number {
  return toDayOffsetMinutes(iso.slice(11, 16));
}

export function durationBetweenTimes(startTime: string, endTime: string): number {
  return toDayOffsetMinutes(endTime) - toDayOffsetMinutes(startTime);
}

export function durationBetweenIso(startIso: string, endIso: string): number {
  return isoToDayOffset(endIso) - isoToDayOffset(startIso);
}

export function crossesMidnight(startTime: string, endTime: string): boolean {
  return parseWallClockMinutes(endTime) <= parseWallClockMinutes(startTime);
}

export function validateScheduleTimeRange(
  startTime: string,
  endTime: string,
  options: { startLabel?: string; endLabel?: string } = {}
): string | null {
  const startLabel = options.startLabel ?? 'startTime';
  const endLabel = options.endLabel ?? 'endTime';
  const start = normalizeTime(startTime);
  const end = normalizeTime(endTime);

  if (!isValidTime(start) || !isValidTime(end)) {
    return null;
  }

  const duration = durationBetweenTimes(start, end);

  if (duration <= 0) {
    return `${endLabel}은 ${startLabel}보다 늦어야 합니다.`;
  }

  if (
    crossesMidnight(start, end) &&
    parseWallClockMinutes(end) > MAX_CROSS_MIDNIGHT_END_MINUTES
  ) {
    return '자정을 넘기는 일정의 종료 시간은 04:00 이하여야 합니다.';
  }

  return null;
}
