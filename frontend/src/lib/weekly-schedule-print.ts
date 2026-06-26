import type { EventInput } from '@fullcalendar/core';
import { DAY_ANCHOR_MINUTES, isoToDayOffset } from '@/lib/schedule-time';
import {
  formatStudyPlanEventTitle,
  getExecutionRecord,
  type ExpandedStudyPlanTodoEvent,
  type PlanSubjectKey,
  type ProfileSubjectsInput,
  type StudyPlanTodo,
} from '@/lib/study-plan-todo';
import { getSubjectColorTokens } from '@/lib/subject-color';
import { getEventDate, isAllDayScheduleEvent } from '@/lib/day-timeline';
import { getWeekDatesContaining, WEEKDAY_LABELS } from '@/lib/user-schedule';
import {
  resolveWeeklyPrintBodyRowCount,
  resolveWeeklyPrintDensity,
  resolvePrintTableRowCount,
} from '@/lib/fit-weekly-print-page';

export type WeeklyPrintEventKind =
  | 'study-plan'
  | 'school'
  | 'user-academy'
  | 'user-fixed'
  | 'user-other'
  | 'user-managed'
  | 'school-allday';

export interface WeeklyPrintEvent {
  id: string;
  kind: WeeklyPrintEventKind;
  date: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
  allDay: boolean;
  showCheckbox: boolean;
  checked: boolean;
  backgroundColor: string;
}

export interface WeeklyPrintTimeRow {
  startMinutes: number;
  endMinutes: number;
  label: string;
}

export interface WeeklyPrintCellItem {
  eventId: string;
  title: string;
  showCheckbox: boolean;
  checked: boolean;
  backgroundColor: string;
}

export interface WeeklyPrintCellPlacement {
  items: WeeklyPrintCellItem[];
  rowspan: number;
  backgroundColor?: string;
}

export interface WeeklyPrintDayColumn {
  date: string;
  headerLabel: string;
  isSunday: boolean;
  allDayItems: WeeklyPrintCellItem[];
  rows: (WeeklyPrintCellPlacement | null)[];
}

export interface WeeklyPrintGrid {
  weekDates: string[];
  rangeLabel: string;
  timeRows: WeeklyPrintTimeRow[];
  allDayRowLabel: string;
  hasAllDayRow: boolean;
  bodyRowCount: number;
  tableRowCount: number;
  printDensity: 'comfortable' | 'compact' | 'dense';
  dayColumns: WeeklyPrintDayColumn[];
  isEmpty: boolean;
}

export interface WeeklyPrintInput {
  anchorDate: string;
  scheduleEvents: EventInput[];
  studyPlanEvents: ExpandedStudyPlanTodoEvent[];
  studyPlanTodos: StudyPlanTodo[];
  subjects?: ProfileSubjectsInput;
  userName: string;
}

function dayOffsetToWallMinutes(offset: number): number {
  const total = offset + DAY_ANCHOR_MINUTES;
  return total >= 24 * 60 ? total - 24 * 60 : total;
}

function formatWallMinutesLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (remainder === 0) {
    return String(hours);
  }

  return `${hours}:${String(remainder).padStart(2, '0')}`;
}

export function formatPrintRowTimeLabel(startOffset: number, endOffset: number): string {
  const start = dayOffsetToWallMinutes(startOffset);
  const end = dayOffsetToWallMinutes(endOffset);
  return `${formatWallMinutesLabel(start)}-${formatWallMinutesLabel(end)}`;
}

export function formatPrintDayHeader(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  const month = parsed.getMonth() + 1;
  const day = parsed.getDate();
  const weekday = WEEKDAY_LABELS[parsed.getDay()];
  return `${month}/${day} (${weekday})`;
}

export function formatWeeklyPrintRangeLabel(weekDates: string[]): string {
  const startDate = new Date(`${weekDates[0]}T12:00:00`);
  const endDate = new Date(`${weekDates[6]}T12:00:00`);
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;
  const startDay = startDate.getDate();
  const endMonth = endDate.getMonth() + 1;
  const endDay = endDate.getDate();

  if (startMonth === endMonth) {
    return `${startYear}년 ${startMonth}월 ${startDay}일 ~ ${endDay}일`;
  }

  return `${startYear}년 ${startMonth}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
}

const PRINT_SCHEDULE_KIND_BACKGROUNDS: Record<
  Exclude<WeeklyPrintEventKind, 'study-plan'>,
  string
> = {
  school: '#E8F0FE',
  'user-academy': '#E8F0FE',
  'user-fixed': '#F1F3F4',
  'user-other': '#F3E8FD',
  'user-managed': '#FFF3E0',
  'school-allday': '#F1F3F4',
};

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

export function resolvePrintEventBackground(
  kind: WeeklyPrintEventKind,
  options: {
    subject?: PlanSubjectKey;
    classNames?: string[];
    subjects?: ProfileSubjectsInput;
  } = {}
): string {
  if (kind === 'study-plan' && options.subject) {
    return getSubjectColorTokens(options.subject, options.subjects).bg;
  }

  const classNames = options.classNames ?? [];
  const subjectKey = resolveSubjectKeyFromClassNames(classNames);

  if (subjectKey) {
    return getSubjectColorTokens(subjectKey, options.subjects).bg;
  }

  if (classNames.includes('school-exam-event')) {
    return '#FCE8E6';
  }

  if (classNames.includes('school-holiday-event')) {
    return '#E6F4EA';
  }

  if (kind === 'study-plan') {
    return '#F8F9FA';
  }

  return PRINT_SCHEDULE_KIND_BACKGROUNDS[kind];
}

function resolveScheduleEventKind(event: EventInput): WeeklyPrintEventKind {
  const classNames = Array.isArray(event.classNames)
    ? event.classNames.map(String)
    : event.classNames
      ? [String(event.classNames)]
      : [];

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

function scheduleEventToPrintEvent(
  event: EventInput,
  weekDateSet: Set<string>,
  subjects?: ProfileSubjectsInput
): WeeklyPrintEvent | null {
  const date = getEventDate(event);
  if (!weekDateSet.has(date)) {
    return null;
  }

  const classNames = getEventClassNames(event);
  const kind = resolveScheduleEventKind(event);
  const backgroundColor = resolvePrintEventBackground(kind, { classNames, subjects });
  const allDay = isAllDayScheduleEvent(event);

  if (allDay) {
    return {
      id: String(event.id ?? `${date}-allday-${event.title}`),
      kind,
      date,
      title: String(event.title ?? ''),
      startMinutes: 0,
      endMinutes: 0,
      allDay: true,
      showCheckbox: false,
      checked: false,
      backgroundColor,
    };
  }

  const startMinutes = isoToDayOffset(String(event.start));
  const endMinutes = isoToDayOffset(String(event.end));

  if (endMinutes <= startMinutes) {
    return null;
  }

  return {
    id: String(event.id ?? `${date}-${event.start}`),
    kind,
    date,
    title: String(event.title ?? ''),
    startMinutes,
    endMinutes,
    allDay: false,
    showCheckbox: false,
    checked: false,
    backgroundColor,
  };
}

function studyPlanEventToPrintEvent(
  event: ExpandedStudyPlanTodoEvent,
  weekDateSet: Set<string>,
  todosById: Map<number, StudyPlanTodo>,
  subjects?: ProfileSubjectsInput
): WeeklyPrintEvent | null {
  const date = event.date;
  if (!weekDateSet.has(date)) {
    return null;
  }

  const startMinutes = isoToDayOffset(event.start);
  const endMinutes = isoToDayOffset(event.end);

  if (endMinutes <= startMinutes) {
    return null;
  }

  const todo = todosById.get(event.todoId);
  const execution = getExecutionRecord(todo, date);

  return {
    id: event.id,
    kind: 'study-plan',
    date,
    title: formatStudyPlanEventTitle(event.subject, event.title, subjects),
    startMinutes,
    endMinutes,
    allDay: false,
    showCheckbox: true,
    checked: execution?.status === 'completed',
    backgroundColor: resolvePrintEventBackground('study-plan', {
      subject: event.subject,
      subjects,
    }),
  };
}

export function collectWeeklyPrintEvents(input: WeeklyPrintInput): WeeklyPrintEvent[] {
  const weekDates = getWeekDatesContaining(input.anchorDate);
  const weekDateSet = new Set(weekDates);
  const todosById = new Map(input.studyPlanTodos.map((todo) => [todo.id, todo]));
  const events: WeeklyPrintEvent[] = [];

  for (const event of input.scheduleEvents) {
    const printEvent = scheduleEventToPrintEvent(event, weekDateSet, input.subjects);
    if (printEvent) {
      events.push(printEvent);
    }
  }

  for (const event of input.studyPlanEvents) {
    const printEvent = studyPlanEventToPrintEvent(event, weekDateSet, todosById, input.subjects);
    if (printEvent) {
      events.push(printEvent);
    }
  }

  return events.sort((left, right) => {
    if (left.date !== right.date) {
      return left.date.localeCompare(right.date);
    }

    if (left.allDay !== right.allDay) {
      return left.allDay ? -1 : 1;
    }

    if (left.startMinutes !== right.startMinutes) {
      return left.startMinutes - right.startMinutes;
    }

    return left.title.localeCompare(right.title, 'ko');
  });
}

function buildDynamicTimeRows(timedEvents: WeeklyPrintEvent[]): WeeklyPrintTimeRow[] {
  const boundaries = new Set<number>();

  for (const event of timedEvents) {
    boundaries.add(event.startMinutes);
    boundaries.add(event.endMinutes);
  }

  const sorted = Array.from(boundaries).sort((left, right) => left - right);

  if (sorted.length < 2) {
    return [];
  }

  const rows: WeeklyPrintTimeRow[] = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const startMinutes = sorted[index];
    const endMinutes = sorted[index + 1];

    const hasEvent = timedEvents.some(
      (event) => event.startMinutes <= startMinutes && event.endMinutes >= endMinutes
    );

    if (!hasEvent) {
      continue;
    }

    rows.push({
      startMinutes,
      endMinutes,
      label: formatPrintRowTimeLabel(startMinutes, endMinutes),
    });
  }

  return rows;
}

function findRowIndexForMinute(rows: WeeklyPrintTimeRow[], minute: number): number {
  return rows.findIndex((row) => row.startMinutes <= minute && row.endMinutes > minute);
}

function findOverlappingRowRange(
  event: WeeklyPrintEvent,
  rows: WeeklyPrintTimeRow[]
): { startRow: number; endRow: number } | null {
  const startRow = findRowIndexForMinute(rows, event.startMinutes);
  const endRow = findRowIndexForMinute(rows, Math.max(event.startMinutes, event.endMinutes - 1));

  if (startRow < 0 || endRow < 0) {
    return null;
  }

  return { startRow, endRow };
}

function syncPlacementBackground(placement: WeeklyPrintCellPlacement): void {
  placement.backgroundColor =
    placement.items.length === 1 ? placement.items[0].backgroundColor : undefined;
}

function toCellItem(event: WeeklyPrintEvent): WeeklyPrintCellItem {
  return {
    eventId: event.id,
    title: event.title,
    showCheckbox: event.showCheckbox,
    checked: event.checked,
    backgroundColor: event.backgroundColor,
  };
}

function buildDayColumns(
  weekDates: string[],
  timedEvents: WeeklyPrintEvent[],
  allDayEvents: WeeklyPrintEvent[],
  timeRows: WeeklyPrintTimeRow[]
): WeeklyPrintDayColumn[] {
  return weekDates.map((date) => {
    const parsed = new Date(`${date}T12:00:00`);
    const dayEvents = timedEvents.filter((event) => event.date === date);
    const dayAllDay = allDayEvents.filter((event) => event.date === date);
    const covered = new Array(timeRows.length).fill(false);
    const rows: (WeeklyPrintCellPlacement | null)[] = new Array(timeRows.length).fill(null);

    const sortedDayEvents = [...dayEvents].sort((left, right) => {
      const durationDiff =
        right.endMinutes - right.startMinutes - (left.endMinutes - left.startMinutes);

      if (durationDiff !== 0) {
        return durationDiff;
      }

      return left.startMinutes - right.startMinutes;
    });

    for (const event of sortedDayEvents) {
      const range = findOverlappingRowRange(event, timeRows);
      if (!range) {
        continue;
      }

      const { startRow, endRow } = range;
      const rowspan = endRow - startRow + 1;
      const item = toCellItem(event);

      if (covered[startRow]) {
        const placement = rows[startRow];
        if (placement) {
          placement.items.push(item);
          placement.rowspan = Math.max(placement.rowspan, rowspan);
          syncPlacementBackground(placement);
        }
        continue;
      }

      const placement: WeeklyPrintCellPlacement = {
        items: [item],
        rowspan,
        backgroundColor: item.backgroundColor,
      };
      rows[startRow] = placement;

      for (let rowIndex = startRow + 1; rowIndex <= endRow; rowIndex += 1) {
        covered[rowIndex] = true;
      }
    }

    return {
      date,
      headerLabel: formatPrintDayHeader(date),
      isSunday: parsed.getDay() === 0,
      allDayItems: dayAllDay.map(toCellItem),
      rows,
    };
  });
}

export function buildWeeklyPrintGrid(input: WeeklyPrintInput): WeeklyPrintGrid {
  const weekDates = getWeekDatesContaining(input.anchorDate);
  const events = collectWeeklyPrintEvents(input);
  const timedEvents = events.filter((event) => !event.allDay);
  const allDayEvents = events.filter((event) => event.allDay);
  const timeRows = buildDynamicTimeRows(timedEvents);
  const dayColumns = buildDayColumns(weekDates, timedEvents, allDayEvents, timeRows);
  const hasAllDayRow = allDayEvents.length > 0;
  const tableRowCount = resolvePrintTableRowCount(timeRows.length, hasAllDayRow);
  const bodyRowCount = resolveWeeklyPrintBodyRowCount(timeRows.length, hasAllDayRow);

  return {
    weekDates,
    rangeLabel: formatWeeklyPrintRangeLabel(weekDates),
    timeRows,
    allDayRowLabel: '종일',
    hasAllDayRow,
    bodyRowCount,
    tableRowCount,
    printDensity: resolveWeeklyPrintDensity(bodyRowCount),
    dayColumns,
    isEmpty: events.length === 0,
  };
}

export type { WeeklyPrintInput as BuildWeeklyPrintGridInput };
