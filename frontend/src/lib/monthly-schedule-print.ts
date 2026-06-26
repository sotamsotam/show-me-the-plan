import type { EventInput } from '@fullcalendar/core';
import { parseAllDayEventDateRange } from '@/lib/calendar-event-range';
import { isAllDayScheduleEvent } from '@/lib/day-timeline';
import { getSubjectColorTokens } from '@/lib/subject-color';
import type { PlanSubjectKey, ProfileSubjectsInput } from '@/lib/study-plan-todo';
import {
  formatIsoDate,
  getMonthRange,
  shiftIsoDate,
  WEEKDAY_LABELS,
} from '@/lib/user-schedule';
import {
  resolveMonthlyPrintDensity,
  resolveMonthlyPrintWeekCount,
} from '@/lib/fit-monthly-print-page';
import {
  resolvePrintEventBackground,
  type WeeklyPrintEventKind,
} from '@/lib/weekly-schedule-print';

export interface MonthlyPrintInput {
  anchorDate: string;
  scheduleEvents: EventInput[];
  subjects?: ProfileSubjectsInput;
  userName: string;
}

export interface MonthlyPrintDayEvent {
  eventId: string;
  title: string;
  backgroundColor: string;
  accentColor: string;
}

export interface MonthlyPrintSpanSegment {
  eventId: string;
  title: string;
  backgroundColor: string;
  accentColor: string;
  colStart: number;
  colSpan: number;
  lane: number;
  continuesFromPriorWeek: boolean;
  continuesToNextWeek: boolean;
}

export interface MonthlyPrintDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isSunday: boolean;
  events: MonthlyPrintDayEvent[];
}

export interface MonthlyPrintWeek {
  days: MonthlyPrintDay[];
  spanSegments: MonthlyPrintSpanSegment[];
  spanLaneCount: number;
}

export interface MonthlyPrintGrid {
  anchorDate: string;
  rangeLabel: string;
  monthYear: number;
  month: number;
  gridDates: string[];
  weekdayLabels: string[];
  weeks: MonthlyPrintWeek[];
  weekCount: number;
  printDensity: 'comfortable' | 'compact' | 'dense';
  isEmpty: boolean;
}

interface MonthlyPrintSourceEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  backgroundColor: string;
  accentColor: string;
  isSpanning: boolean;
}

function getEventClassNames(event: EventInput): string[] {
  return Array.isArray(event.classNames)
    ? event.classNames.map(String)
    : event.classNames
      ? [String(event.classNames)]
      : [];
}

function resolveSubjectKeyFromClassNames(classNames: string[]): PlanSubjectKey | undefined {
  const subjectClass = classNames.find(
    (name) => name.startsWith('subject-') && name !== 'subject-custom-color'
  );

  if (!subjectClass) {
    return undefined;
  }

  return subjectClass.replace('subject-', '') as PlanSubjectKey;
}

function resolveScheduleEventKind(event: EventInput): WeeklyPrintEventKind {
  const classNames = getEventClassNames(event);

  if (classNames.includes('school-event')) {
    return 'school';
  }

  if (classNames.includes('user-event-academy')) {
    return 'user-academy';
  }

  if (classNames.includes('user-event-fixed')) {
    return 'user-fixed';
  }

  if (classNames.includes('user-event-other')) {
    return 'user-other';
  }

  if (classNames.includes('user-event-managed') || classNames.includes('user-event')) {
    return 'user-managed';
  }

  const type = (event.extendedProps as Record<string, unknown> | undefined)?.type;

  if (type === 'school-exam' || type === 'school-holiday') {
    return 'school-allday';
  }

  return 'user-other';
}

const PRINT_ACCENT_FALLBACKS: Record<WeeklyPrintEventKind, string> = {
  'study-plan': '#1a73e8',
  school: '#1a73e8',
  'user-academy': '#1a73e8',
  'user-fixed': '#5f6368',
  'user-other': '#9334e6',
  'user-managed': '#e8710a',
  'school-allday': '#5f6368',
};

function resolvePrintEventAccent(
  kind: WeeklyPrintEventKind,
  options: {
    classNames?: string[];
    subjects?: ProfileSubjectsInput;
  } = {}
): string {
  const classNames = options.classNames ?? [];
  const subjectKey = resolveSubjectKeyFromClassNames(classNames);

  if (subjectKey) {
    return getSubjectColorTokens(subjectKey, options.subjects).accent;
  }

  if (classNames.includes('school-exam-event')) {
    return '#c5221f';
  }

  if (classNames.includes('school-holiday-event')) {
    return '#137333';
  }

  return PRINT_ACCENT_FALLBACKS[kind];
}

function compareIsoDates(left: string, right: string): number {
  return left.localeCompare(right);
}

function maxIsoDate(left: string, right: string): string {
  return compareIsoDates(left, right) >= 0 ? left : right;
}

function minIsoDate(left: string, right: string): string {
  return compareIsoDates(left, right) <= 0 ? left : right;
}

function countInclusiveDays(startDate: string, endDate: string): number {
  let count = 0;
  let cursor = startDate;

  while (compareIsoDates(cursor, endDate) <= 0) {
    count += 1;
    cursor = shiftIsoDate(cursor, 1);
  }

  return count;
}

export function formatMonthlyPrintRangeLabel(anchorDate: string): string {
  const parsed = new Date(`${anchorDate}T12:00:00`);
  return `${parsed.getFullYear()}년 ${parsed.getMonth() + 1}월`;
}

export function buildMonthGridDates(anchorDate: string): string[] {
  const parsed = new Date(`${anchorDate}T12:00:00`);
  const monthStart = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  const monthEnd = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0);

  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - ((monthStart.getDay() + 6) % 7));

  const monthEndWeekStart = new Date(monthEnd);
  monthEndWeekStart.setDate(monthEnd.getDate() - ((monthEnd.getDay() + 6) % 7));

  const gridEnd = new Date(monthEndWeekStart);
  gridEnd.setDate(monthEndWeekStart.getDate() + 6);

  const dates: string[] = [];
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    dates.push(formatIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function collectMonthViewScheduleEvents(events: EventInput[]): EventInput[] {
  return events.filter((event) => isAllDayScheduleEvent(event));
}

function parseSourceEvent(
  event: EventInput,
  subjects?: ProfileSubjectsInput
): MonthlyPrintSourceEvent | null {
  const startValue = event.start;

  if (!startValue) {
    return null;
  }

  const startDate = new Date(String(startValue));
  const endDate = event.end ? new Date(String(event.end)) : null;
  const range = parseAllDayEventDateRange(startDate, endDate);
  const classNames = getEventClassNames(event);
  const kind = resolveScheduleEventKind(event);

  return {
    id: String(event.id ?? `${range.date}-${event.title}`),
    title: String(event.title ?? ''),
    startDate: range.date,
    endDate: range.endDate,
    backgroundColor: resolvePrintEventBackground(kind, { classNames, subjects }),
    accentColor: resolvePrintEventAccent(kind, { classNames, subjects }),
    isSpanning: range.date !== range.endDate,
  };
}

export function collectMonthlyPrintEvents(
  scheduleEvents: EventInput[],
  gridDates: string[],
  subjects?: ProfileSubjectsInput
): MonthlyPrintSourceEvent[] {
  const gridStart = gridDates[0];
  const gridEnd = gridDates[gridDates.length - 1];
  const monthEvents = collectMonthViewScheduleEvents(scheduleEvents);
  const collected: MonthlyPrintSourceEvent[] = [];

  for (const event of monthEvents) {
    const parsed = parseSourceEvent(event, subjects);

    if (!parsed) {
      continue;
    }

    if (parsed.endDate < gridStart || parsed.startDate > gridEnd) {
      continue;
    }

    collected.push(parsed);
  }

  return collected.sort((left, right) => {
    if (left.startDate !== right.startDate) {
      return left.startDate.localeCompare(right.startDate);
    }

    const durationDiff =
      countInclusiveDays(right.startDate, right.endDate) -
      countInclusiveDays(left.startDate, left.endDate);

    if (durationDiff !== 0) {
      return durationDiff;
    }

    return left.title.localeCompare(right.title, 'ko');
  });
}

function buildWeekSpanSegments(
  weekDates: string[],
  spanningEvents: MonthlyPrintSourceEvent[]
): { segments: MonthlyPrintSpanSegment[]; laneCount: number } {
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const relevant = spanningEvents.filter(
    (event) => event.startDate <= weekEnd && event.endDate >= weekStart
  );

  const sorted = [...relevant].sort((left, right) => {
    const durationDiff =
      countInclusiveDays(right.startDate, right.endDate) -
      countInclusiveDays(left.startDate, left.endDate);

    if (durationDiff !== 0) {
      return durationDiff;
    }

    if (left.startDate !== right.startDate) {
      return left.startDate.localeCompare(right.startDate);
    }

    return left.title.localeCompare(right.title, 'ko');
  });

  const laneEnds: string[] = [];
  const segments: MonthlyPrintSpanSegment[] = [];

  for (const event of sorted) {
    const segmentStart = maxIsoDate(event.startDate, weekStart);
    const segmentEnd = minIsoDate(event.endDate, weekEnd);
    const colStart = weekDates.indexOf(segmentStart);
    const colSpan = countInclusiveDays(segmentStart, segmentEnd);

    if (colStart < 0 || colSpan <= 0) {
      continue;
    }

    let lane = 0;

    while (lane < laneEnds.length && compareIsoDates(laneEnds[lane], segmentStart) >= 0) {
      lane += 1;
    }

    laneEnds[lane] = segmentEnd;

    segments.push({
      eventId: `${event.id}-${weekStart}-${lane}`,
      title: event.title,
      backgroundColor: event.backgroundColor,
      accentColor: event.accentColor,
      colStart,
      colSpan,
      lane,
      continuesFromPriorWeek: event.startDate < weekStart,
      continuesToNextWeek: event.endDate > weekEnd,
    });
  }

  return {
    segments,
    laneCount: laneEnds.length,
  };
}

function buildWeeks(
  gridDates: string[],
  monthYear: number,
  month: number,
  events: MonthlyPrintSourceEvent[]
): MonthlyPrintWeek[] {
  const spanningEvents = events.filter((event) => event.isSpanning);
  const singleDayEvents = events.filter((event) => !event.isSpanning);
  const weeks: MonthlyPrintWeek[] = [];

  for (let weekIndex = 0; weekIndex < gridDates.length; weekIndex += 7) {
    const weekDates = gridDates.slice(weekIndex, weekIndex + 7);
    const { segments, laneCount } = buildWeekSpanSegments(weekDates, spanningEvents);

    const days = weekDates.map((date) => {
      const parsed = new Date(`${date}T12:00:00`);

      return {
        date,
        dayNumber: parsed.getDate(),
        isCurrentMonth: parsed.getFullYear() === monthYear && parsed.getMonth() === month,
        isSunday: parsed.getDay() === 0,
        events: singleDayEvents
          .filter((event) => event.startDate === date)
          .map((event) => ({
            eventId: event.id,
            title: event.title,
            backgroundColor: event.backgroundColor,
            accentColor: event.accentColor,
          })),
      };
    });

    weeks.push({
      days,
      spanSegments: segments,
      spanLaneCount: laneCount,
    });
  }

  return weeks;
}

export function buildMonthlyPrintGrid(input: MonthlyPrintInput): MonthlyPrintGrid {
  const parsedAnchor = new Date(`${input.anchorDate}T12:00:00`);
  const monthYear = parsedAnchor.getFullYear();
  const month = parsedAnchor.getMonth();
  const gridDates = buildMonthGridDates(input.anchorDate);
  const events = collectMonthlyPrintEvents(input.scheduleEvents, gridDates, input.subjects);
  const weeks = buildWeeks(gridDates, monthYear, month, events);
  const weekCount = weeks.length;

  return {
    anchorDate: input.anchorDate,
    rangeLabel: formatMonthlyPrintRangeLabel(input.anchorDate),
    monthYear,
    month,
    gridDates,
    weekdayLabels: ['월', '화', '수', '목', '금', '토', '일'],
    weeks,
    weekCount,
    printDensity: resolveMonthlyPrintDensity(weekCount, events.length),
    isEmpty: events.length === 0,
  };
}

export function getMonthlyPrintWeekdayLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return WEEKDAY_LABELS[parsed.getDay()];
}

export function getMonthlyPrintMonthBounds(anchorDate: string): { start: string; end: string } {
  return getMonthRange(anchorDate);
}

export { resolveMonthlyPrintWeekCount };
