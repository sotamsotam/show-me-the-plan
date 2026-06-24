/**
 * Schedule time helpers aligned with the app study-day model:
 * logical day runs from 05:00 through 04:00 the next calendar morning.
 *
 * Storage keeps HH:mm only. When endTime < startTime (wall clock), the range
 * crosses midnight and the end instant belongs to the next calendar day.
 */

export const DAY_ANCHOR_MINUTES = 5 * 60;

/** Placeholder times stored for all-day schedules (validation skipped when allDay is true). */
export const ALL_DAY_START_TIME = '00:00';
export const ALL_DAY_END_TIME = '00:00';

/** Latest allowed end time when a range crosses midnight (matches calendar slotMaxTime 28:00). */
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

function parseIsoDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftIsoDate(date: string, days: number): string {
  const parsed = parseIsoDate(date);
  parsed.setDate(parsed.getDate() + days);
  return formatIsoDate(parsed);
}

/** Minutes from the 05:00 study-day anchor. */
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

/** True when end is on the next calendar morning relative to start (HH:mm wall clock). */
export function crossesMidnight(startTime: string, endTime: string): boolean {
  return parseWallClockMinutes(endTime) <= parseWallClockMinutes(startTime);
}

/** Map a calendar date + wall-clock time to the study-day occurrence date (05:00 anchor). */
export function resolveStudyDayDate(calendarDate: string, wallClockTime: string): string {
  if (parseWallClockMinutes(wallClockTime) < DAY_ANCHOR_MINUTES) {
    return shiftIsoDate(calendarDate, -1);
  }

  return calendarDate;
}

export function resolveStudyDayDateFromIso(iso: string): string {
  return resolveStudyDayDate(iso.slice(0, 10), iso.slice(11, 16));
}

export function resolveEndDate(
  occurrenceDate: string,
  startTime: string,
  endTime: string
): string {
  if (crossesMidnight(startTime, endTime)) {
    return shiftIsoDate(occurrenceDate, 1);
  }

  return occurrenceDate;
}

export function buildScheduleStartIso(occurrenceDate: string, startTime: string): string {
  return `${occurrenceDate}T${normalizeTime(startTime)}:00`;
}

export function buildScheduleEndIso(
  occurrenceDate: string,
  startTime: string,
  endTime: string
): string {
  const endDate = resolveEndDate(occurrenceDate, startTime, endTime);
  return `${endDate}T${normalizeTime(endTime)}:00`;
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
