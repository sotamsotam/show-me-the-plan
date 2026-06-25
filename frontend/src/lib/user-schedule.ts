import type { EventInput } from '@fullcalendar/core';

export type RecurrenceType = 'weekly' | 'once';
export type ScheduleCategory = 'managed' | 'academy' | 'fixed' | 'other';

export const SCHEDULE_CATEGORY_OPTIONS = [
  { value: 'managed' as const, label: '공부 가능시간' },
  { value: 'academy' as const, label: '학원 수업시간' },
  { value: 'fixed' as const, label: '고정시간 (예: 학업 외 예체능학원시간)' },
  { value: 'other' as const, label: '기타' },
] as const;

/** 일정 추가 폼용 — '공부 가능시간'은 삭제하지 않고 주석으로만 미노출 */
export const SCHEDULE_CATEGORY_OPTIONS_FOR_CREATE = [
  // { value: 'managed' as const, label: '공부 가능시간' },
  { value: 'academy' as const, label: '학원 수업시간' },
  { value: 'fixed' as const, label: '고정시간 (예: 학업 외 예체능학원 시간 등)' },
  { value: 'other' as const, label: '기타' },
] as const;

export function scheduleCategoryEventClassName(scheduleCategory: ScheduleCategory): string {
  return `user-event-${scheduleCategory}`;
}

const SCHEDULE_CATEGORY_LIST_PREFIX: Record<ScheduleCategory, string> = {
  managed: '공부',
  academy: '학원',
  fixed: '고정',
  other: '기타',
};

export function getScheduleCategoryListPrefix(category: ScheduleCategory): string {
  return SCHEDULE_CATEGORY_LIST_PREFIX[category];
}

export function formatUserScheduleListTitle(
  title: string,
  scheduleCategory: ScheduleCategory
): string {
  return `[${getScheduleCategoryListPrefix(scheduleCategory)}] ${title}`;
}

export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export const WEEKDAY_OPTIONS = [
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
  { value: 0, label: '일' },
] as const;

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export interface ScheduleOccurrenceOverride {
  title: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleAttachment {
  id: number;
  url: string;
  name: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
}

export function isAllWeekdaysSelected(daysOfWeek: number[]): boolean {
  return ALL_WEEKDAYS.every((day) => daysOfWeek.includes(day));
}

export function toggleWeekday(daysOfWeek: number[], day: number, checked: boolean): number[] {
  if (checked) {
    return Array.from(new Set([...daysOfWeek, day])).sort((a, b) => a - b);
  }

  return daysOfWeek.filter((value) => value !== day);
}

export function toggleAllWeekdays(checked: boolean): number[] {
  return checked ? [...ALL_WEEKDAYS] : [];
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayIsoDate(): string {
  return formatIsoDate(new Date());
}

export function shiftIsoDate(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return formatIsoDate(parsed);
}

/** 월요일 시작 주간 — `date`가 속한 주의 ISO 날짜 7개 (월~일) */
export function getWeekDatesContaining(date: string): string[] {
  const parsed = new Date(`${date}T12:00:00`);
  const weekStart = new Date(parsed);
  weekStart.setDate(parsed.getDate() - ((parsed.getDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return formatIsoDate(day);
  });
}

export function getMonthRange(date: string): { start: string; end: string } {
  const parsed = new Date(`${date}T12:00:00`);
  const start = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  const end = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0);
  return { start: formatIsoDate(start), end: formatIsoDate(end) };
}

export function formatOccurrenceDateLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  const weekday = WEEKDAY_LABELS[parsed.getDay()];
  return `${date} (${weekday})`;
}

export function resolveOccurrenceFields(
  schedule: UserSchedule,
  date: string
): ScheduleOccurrenceOverride {
  const override = schedule.overrides[date];

  if (override) {
    return override;
  }

  return {
    title: schedule.title,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
  };
}

export interface UserSchedule {
  id: number;
  title: string;
  scheduleCategory: ScheduleCategory;
  startTime: string;
  endTime: string;
  allDay: boolean;
  recurrenceType: RecurrenceType;
  daysOfWeek: number[];
  validFrom: string | null;
  validUntil: string | null;
  date: string | null;
  endDate: string | null;
  excludedDates: string[];
  overrides: Record<string, ScheduleOccurrenceOverride>;
  attachments?: ScheduleAttachment[];
}

export interface ExpandedScheduleEvent {
  id: string;
  scheduleId: number;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  date: string;
  recurrenceType: RecurrenceType;
  scheduleCategory: ScheduleCategory;
  hasOverride: boolean;
  attachments?: ScheduleAttachment[];
}

export interface UserScheduleInput {
  title: string;
  scheduleCategory: ScheduleCategory;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  recurrenceType: RecurrenceType;
  daysOfWeek?: number[];
  validFrom?: string;
  validUntil?: string;
  date?: string;
  endDate?: string | null;
  attachmentIds?: number[];
}

export interface OccurrenceOverrideInput {
  title: string;
  startTime: string;
  endTime: string;
}

export function expandedEventsToCalendarEvents(
  events: ExpandedScheduleEvent[]
): EventInput[] {
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay || undefined,
    editable: false,
    classNames: [
      'user-event',
      'cal-event-card',
      scheduleCategoryEventClassName(event.scheduleCategory),
    ],
    extendedProps: {
      type: 'user',
      scheduleId: event.scheduleId,
      recurrenceType: event.recurrenceType,
      scheduleCategory: event.scheduleCategory,
      date: event.date,
      hasOverride: event.hasOverride,
      allDay: event.allDay,
      ...(event.attachments?.length ? { attachments: event.attachments } : {}),
    },
  }));
}
