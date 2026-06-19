import type { EventInput } from '@fullcalendar/core';
import { formatIsoDate } from '@/lib/user-schedule';

export function isAllDayCalendarEvent(event: EventInput): boolean {
  if (event.allDay) {
    return true;
  }

  const type = (event.extendedProps as Record<string, unknown> | undefined)?.type;
  return type === 'school-exam' || type === 'school-holiday';
}

/** FullCalendar all-day select end is exclusive; returns inclusive last day (YYYY-MM-DD). */
export function inclusiveEndFromAllDaySelection(start: Date, end: Date): string {
  if (end.getTime() <= start.getTime()) {
    return formatIsoDate(start);
  }

  const inclusiveEnd = new Date(end);
  inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
  return formatIsoDate(inclusiveEnd);
}

/** FullCalendar month/day-grid selection uses midnight-aligned day span(s). */
export function isAllDayCalendarSelection(start: Date, end: Date): boolean {
  const isMidnight =
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    start.getSeconds() === 0 &&
    start.getMilliseconds() === 0;

  if (!isMidnight) {
    return false;
  }

  const durationMs = end.getTime() - start.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return durationMs === 0 || (durationMs >= dayMs && durationMs % dayMs === 0);
}

export interface ParsedEventDateTimeRange {
  date: string;
  startTime: string;
  endTime: string;
}

function formatTimeFromDate(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Map FullCalendar all-day drag/resize to schedule date + inclusive endDate. */
export interface ParsedAllDayEventDateRange {
  date: string;
  endDate: string;
}

export function parseAllDayEventDateRange(
  start: Date,
  end: Date | null
): ParsedAllDayEventDateRange {
  const date = formatIsoDate(start);

  if (!end) {
    return { date, endDate: date };
  }

  return {
    date,
    endDate: inclusiveEndFromAllDaySelection(start, end),
  };
}

/** Map FullCalendar event instants to schedule date + HH:mm fields (study-day model). */
export function parseEventDateTimeRange(start: Date, end: Date): ParsedEventDateTimeRange {
  return {
    date: formatIsoDate(start),
    startTime: formatTimeFromDate(start),
    endTime: formatTimeFromDate(end),
  };
}
