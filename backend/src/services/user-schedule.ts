import {
  ALL_DAY_END_TIME,
  ALL_DAY_START_TIME,
  buildScheduleEndIso,
  buildScheduleStartIso,
  isValidTime,
  normalizeTime,
  shiftIsoDate,
  validateScheduleTimeRange,
} from './schedule-time';
import {
  normalizeAttachmentIds,
  normalizeScheduleAttachments,
  SCHEDULE_ATTACHMENT_MAX_COUNT,
  type ScheduleAttachment,
  validateScheduleAttachmentPolicy,
} from './schedule-attachment';

export type RecurrenceType = 'weekly' | 'once';
export type ScheduleCategory = 'managed' | 'academy' | 'fixed' | 'other';

export const SCHEDULE_CATEGORIES: ScheduleCategory[] = [
  'managed',
  'academy',
  'fixed',
  'other',
];

export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export interface ScheduleOccurrenceOverride {
  title: string;
  startTime: string;
  endTime: string;
}

export interface OccurrenceOverrideInput {
  title?: string;
  startTime?: string;
  endTime?: string;
}

export interface UserScheduleInput {
  title?: string;
  scheduleCategory?: ScheduleCategory;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  recurrenceType?: RecurrenceType;
  daysOfWeek?: number[];
  validFrom?: string;
  validUntil?: string;
  date?: string;
  endDate?: string | null;
  excludedDates?: string[];
  overrides?: Record<string, ScheduleOccurrenceOverride>;
  attachmentIds?: number[];
}

export interface UserScheduleRecord {
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
  attachments: ScheduleAttachment[];
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

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

function normalizeDateValue(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return formatIsoDate(value);
  }

  const text = String(value);
  return text.slice(0, 10);
}

function eachDateInRange(startYmd: string, endYmd: string): string[] {
  const dates: string[] = [];
  const current = parseIsoDate(startYmd);
  const end = parseIsoDate(endYmd);

  while (current < end) {
    dates.push(formatIsoDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
  );
}

export function normalizeDaysOfWeek(
  value: unknown,
  legacyDayOfWeek?: unknown
): number[] {
  if (Array.isArray(value)) {
    const days = [...new Set(
      value
        .map((item) => Number(item))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    )].sort((a, b) => a - b);

    if (days.length > 0) {
      return days;
    }
  }

  if (legacyDayOfWeek != null) {
    const day = Number(legacyDayOfWeek);
    if (Number.isInteger(day) && day >= 0 && day <= 6) {
      return [day];
    }
  }

  return [];
}

export function normalizeExcludedDates(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .map((item) => String(item).slice(0, 10))
      .filter((date) => isValidIsoDate(date))
  )].sort();
}

export function normalizeOverrides(
  value: unknown
): Record<string, ScheduleOccurrenceOverride> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const overrides: Record<string, ScheduleOccurrenceOverride> = {};

  for (const [rawDate, rawOverride] of Object.entries(value)) {
    const date = rawDate.slice(0, 10);
    if (!isValidIsoDate(date) || !rawOverride || typeof rawOverride !== 'object') {
      continue;
    }

    const entry = rawOverride as Record<string, unknown>;
    const title = typeof entry.title === 'string' ? entry.title.trim() : '';
    const startTime =
      typeof entry.startTime === 'string' ? normalizeTime(entry.startTime) : '';
    const endTime = typeof entry.endTime === 'string' ? normalizeTime(entry.endTime) : '';

    if (!title || !isValidTime(startTime) || !isValidTime(endTime)) {
      continue;
    }

    if (validateScheduleTimeRange(startTime, endTime)) {
      continue;
    }

    overrides[date] = { title, startTime, endTime };
  }

  return overrides;
}

function normalizeScheduleCategory(value: unknown): ScheduleCategory {
  if (typeof value === 'string' && SCHEDULE_CATEGORIES.includes(value as ScheduleCategory)) {
    return value as ScheduleCategory;
  }

  return 'managed';
}

export function toScheduleRecord(raw: Record<string, unknown>): UserScheduleRecord {
  return {
    id: Number(raw.id),
    title: String(raw.title),
    scheduleCategory: normalizeScheduleCategory(raw.scheduleCategory),
    startTime: normalizeTime(String(raw.startTime)),
    endTime: normalizeTime(String(raw.endTime)),
    allDay: raw.allDay === true,
    recurrenceType: raw.recurrenceType as RecurrenceType,
    daysOfWeek: normalizeDaysOfWeek(raw.daysOfWeek, raw.dayOfWeek),
    validFrom: normalizeDateValue(raw.validFrom),
    validUntil: normalizeDateValue(raw.validUntil),
    date: normalizeDateValue(raw.date),
    endDate: normalizeDateValue(raw.endDate),
    excludedDates: normalizeExcludedDates(raw.excludedDates),
    overrides: normalizeOverrides(raw.overrides),
    attachments: normalizeScheduleAttachments(raw.attachments),
  };
}

export function isValidOccurrenceDate(
  schedule: UserScheduleRecord,
  date: string
): boolean {
  if (schedule.recurrenceType !== 'weekly') {
    return false;
  }

  if (!schedule.validFrom || !schedule.validUntil) {
    return false;
  }

  if (date < schedule.validFrom || date > schedule.validUntil) {
    return false;
  }

  return schedule.daysOfWeek.includes(parseIsoDate(date).getDay());
}

export function resolveOccurrenceFields(
  schedule: UserScheduleRecord,
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

export function validateOccurrenceOverride(
  input: OccurrenceOverrideInput,
  options: { allDay?: boolean } = {}
): string | null {
  if (!input.title?.trim()) {
    return 'title은 필수입니다.';
  }

  if (options.allDay) {
    return null;
  }

  if (!input.startTime || !isValidTime(input.startTime)) {
    return 'startTime은 HH:mm 형식이어야 합니다.';
  }

  if (!input.endTime || !isValidTime(input.endTime)) {
    return 'endTime은 HH:mm 형식이어야 합니다.';
  }

  const timeError = validateScheduleTimeRange(input.startTime, input.endTime);
  if (timeError) {
    return timeError;
  }

  return null;
}

export function buildOccurrenceExclusionUpdate(schedule: UserScheduleRecord, date: string) {
  const overrides = { ...schedule.overrides };
  delete overrides[date];

  return {
    excludedDates: normalizeExcludedDates([...schedule.excludedDates, date]),
    overrides,
  };
}

export interface OccurrenceDetachInput {
  toDate: string;
  title: string;
  startTime: string;
  endTime: string;
}

export function validateOccurrenceDetachInput(
  schedule: UserScheduleRecord,
  fromDate: string,
  input: OccurrenceDetachInput
): string | null {
  if (schedule.recurrenceType !== 'weekly') {
    return '반복 일정만 분리할 수 있습니다.';
  }

  const toDate = input.toDate.slice(0, 10);

  if (!isValidIsoDate(toDate)) {
    return 'toDate는 YYYY-MM-DD 형식이어야 합니다.';
  }

  if (fromDate === toDate) {
    return '같은 날짜로는 분리할 수 없습니다. 시간 변경은 occurrence 수정 API를 사용하세요.';
  }

  if (!isOccurrenceEditableSource(schedule, fromDate)) {
    return '해당 날짜는 이 반복 일정에 포함되지 않습니다.';
  }

  return validateOccurrenceOverride(
    {
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
    },
    { allDay: schedule.allDay }
  );
}

export function buildParentOccurrenceDetachUpdate(
  schedule: UserScheduleRecord,
  fromDate: string
): Record<string, unknown> {
  return buildOccurrenceExclusionUpdate(schedule, fromDate);
}

export function buildDetachedOnceScheduleCreateData(
  schedule: UserScheduleRecord,
  input: OccurrenceDetachInput
): Record<string, unknown> {
  const toDate = input.toDate.slice(0, 10);

  return buildScheduleData({
    title: input.title,
    scheduleCategory: schedule.scheduleCategory,
    allDay: schedule.allDay,
    startTime: input.startTime,
    endTime: input.endTime,
    recurrenceType: 'once',
    date: toDate,
  });
}

export function buildOccurrenceOverrideUpdate(
  schedule: UserScheduleRecord,
  date: string,
  input: OccurrenceOverrideInput
): { excludedDates: string[]; overrides: Record<string, ScheduleOccurrenceOverride> } {
  return {
    excludedDates: schedule.excludedDates.filter((value) => value !== date),
    overrides: {
      ...schedule.overrides,
      [date]: {
        title: input.title!.trim(),
        startTime: schedule.allDay
          ? ALL_DAY_START_TIME
          : normalizeTime(input.startTime!),
        endTime: schedule.allDay ? ALL_DAY_END_TIME : normalizeTime(input.endTime!),
      },
    },
  };
}

export function hasActiveOccurrenceOnDate(
  schedule: UserScheduleRecord,
  date: string
): boolean {
  if (schedule.excludedDates.includes(date)) {
    return false;
  }

  if (schedule.overrides[date]) {
    return true;
  }

  return isValidOccurrenceDate(schedule, date);
}

export function isOccurrenceEditableSource(
  schedule: UserScheduleRecord,
  date: string
): boolean {
  if (schedule.excludedDates.includes(date)) {
    return false;
  }

  if (schedule.overrides[date]) {
    return true;
  }

  return isValidOccurrenceDate(schedule, date);
}

export function validateOccurrenceMoveTarget(
  schedule: UserScheduleRecord,
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

export interface OccurrenceMoveInput extends OccurrenceOverrideInput {
  toDate: string;
}

export function validateOccurrenceMove(
  input: OccurrenceMoveInput,
  options: { allDay?: boolean } = {}
): string | null {
  const toDate = input.toDate?.slice(0, 10);

  if (!toDate || !isValidIsoDate(toDate)) {
    return 'toDate는 YYYY-MM-DD 형식이어야 합니다.';
  }

  return validateOccurrenceOverride(input, options);
}

export function buildOccurrenceMoveUpdate(
  schedule: UserScheduleRecord,
  fromDate: string,
  toDate: string,
  input: OccurrenceOverrideInput
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
    title: input.title!.trim(),
    startTime: schedule.allDay
      ? ALL_DAY_START_TIME
      : normalizeTime(input.startTime!),
    endTime: schedule.allDay ? ALL_DAY_END_TIME : normalizeTime(input.endTime!),
  };

  return {
    excludedDates: normalizeExcludedDates(excludedDates),
    overrides,
  };
}

export function validateScheduleInput(
  input: UserScheduleInput,
  options: { partial?: boolean } = {}
): string | null {
  const partial = options.partial ?? false;
  const has = (key: keyof UserScheduleInput) => input[key] !== undefined;
  const isAllDay = input.allDay === true;

  if (!partial || has('title')) {
    if (!input.title?.trim()) {
      return 'title은 필수입니다.';
    }
  }

  if (!isAllDay) {
    if (!partial || has('startTime')) {
      if (!input.startTime || !isValidTime(input.startTime)) {
        return 'startTime은 HH:mm 형식이어야 합니다.';
      }
    }

    if (!partial || has('endTime')) {
      if (!input.endTime || !isValidTime(input.endTime)) {
        return 'endTime은 HH:mm 형식이어야 합니다.';
      }
    }

    if (
      input.startTime &&
      input.endTime &&
      isValidTime(input.startTime) &&
      isValidTime(input.endTime)
    ) {
      const timeError = validateScheduleTimeRange(input.startTime, input.endTime);
      if (timeError) {
        return timeError;
      }
    }
  }

  if (!partial || has('scheduleCategory')) {
    if (
      !input.scheduleCategory ||
      !SCHEDULE_CATEGORIES.includes(input.scheduleCategory)
    ) {
      return 'scheduleCategory는 managed, academy, fixed, other 중 하나여야 합니다.';
    }
  }

  if (!partial || has('recurrenceType')) {
    if (input.recurrenceType !== 'weekly' && input.recurrenceType !== 'once') {
      return 'recurrenceType은 weekly 또는 once여야 합니다.';
    }
  }

  const recurrenceType = input.recurrenceType;

  if (recurrenceType === 'weekly') {
    if (!partial || has('daysOfWeek')) {
      const days = normalizeDaysOfWeek(input.daysOfWeek);
      if (days.length === 0) {
        return 'daysOfWeek는 최소 1개 요일이 필요합니다.';
      }
    }

    if (!partial || has('validFrom')) {
      if (!input.validFrom || !isValidIsoDate(input.validFrom)) {
        return 'validFrom은 YYYY-MM-DD 형식이어야 합니다.';
      }
    }

    if (!partial || has('validUntil')) {
      if (!input.validUntil || !isValidIsoDate(input.validUntil)) {
        return 'validUntil은 YYYY-MM-DD 형식이어야 합니다.';
      }
    }

    if (
      input.validFrom &&
      input.validUntil &&
      isValidIsoDate(input.validFrom) &&
      isValidIsoDate(input.validUntil) &&
      input.validFrom > input.validUntil
    ) {
      return 'validUntil은 validFrom보다 같거나 늦어야 합니다.';
    }
  }

  if (recurrenceType === 'once') {
    if (!partial || has('date')) {
      if (!input.date || !isValidIsoDate(input.date)) {
        return 'date는 YYYY-MM-DD 형식이어야 합니다.';
      }
    }

    const isAllDay = input.allDay === true;
    const endDate = input.endDate?.slice(0, 10) ?? input.date;

    if (isAllDay && endDate) {
      if (!isValidIsoDate(endDate)) {
        return 'endDate는 YYYY-MM-DD 형식이어야 합니다.';
      }

      if (input.date && endDate < input.date) {
        return 'endDate는 date보다 같거나 늦어야 합니다.';
      }
    }
  }

  if (has('attachmentIds')) {
    const attachmentIds = normalizeAttachmentIds(input.attachmentIds);

    if (!partial || has('allDay')) {
      const attachmentError = validateScheduleAttachmentPolicy({
        allDay: input.allDay === true,
        attachmentIds,
      });

      if (attachmentError) {
        return attachmentError;
      }
    } else if (attachmentIds.length > SCHEDULE_ATTACHMENT_MAX_COUNT) {
      return `첨부 이미지는 최대 ${SCHEDULE_ATTACHMENT_MAX_COUNT}장까지 등록할 수 있습니다.`;
    }
  }

  return null;
}

export function buildScheduleData(input: UserScheduleInput): Record<string, unknown> {
  const recurrenceType = input.recurrenceType!;
  const allDay = input.allDay === true;
  const data: Record<string, unknown> = {
    title: input.title!.trim(),
    scheduleCategory: input.scheduleCategory ?? 'managed',
    startTime: allDay ? ALL_DAY_START_TIME : normalizeTime(input.startTime!),
    endTime: allDay ? ALL_DAY_END_TIME : normalizeTime(input.endTime!),
    allDay,
    recurrenceType,
    daysOfWeek: null,
    validFrom: null,
    validUntil: null,
    date: null,
    excludedDates: [],
    overrides: {},
  };

  if (recurrenceType === 'weekly') {
    data.daysOfWeek = normalizeDaysOfWeek(input.daysOfWeek);
    data.validFrom = input.validFrom;
    data.validUntil = input.validUntil;
    data.excludedDates = normalizeExcludedDates(input.excludedDates ?? []);
    data.overrides = normalizeOverrides(input.overrides ?? {});
  } else {
    data.date = input.date;
    if (allDay && input.date && input.endDate) {
      const end = input.endDate.slice(0, 10);
      data.endDate = end > input.date ? end : null;
    } else {
      data.endDate = null;
    }
  }

  return data;
}

function resolveOnceInclusiveEndDate(schedule: UserScheduleRecord): string {
  if (!schedule.date) {
    return '';
  }

  if (
    schedule.endDate &&
    schedule.endDate >= schedule.date
  ) {
    return schedule.endDate;
  }

  return schedule.date;
}

function scheduleOverlapsRange(
  schedule: UserScheduleRecord,
  rangeStart: string,
  rangeEnd: string
): boolean {
  if (schedule.recurrenceType === 'once') {
    if (!schedule.date) {
      return false;
    }

    const inclusiveEnd = resolveOnceInclusiveEndDate(schedule);
    return schedule.date < rangeEnd && inclusiveEnd >= rangeStart;
  }

  if (!schedule.validFrom || !schedule.validUntil) {
    return false;
  }

  return schedule.validFrom < rangeEnd && schedule.validUntil >= rangeStart;
}

function buildExpandedEvent(
  schedule: UserScheduleRecord,
  date: string,
  title: string,
  startTime: string,
  endTime: string,
  hasOverride: boolean
): ExpandedScheduleEvent {
  const attachments =
    schedule.allDay && schedule.attachments.length > 0 ? schedule.attachments : undefined;

  const base = {
    id: `user-${schedule.id}-${date}`,
    scheduleId: schedule.id,
    title,
    date,
    recurrenceType: schedule.recurrenceType,
    scheduleCategory: schedule.scheduleCategory,
    hasOverride,
    ...(attachments ? { attachments } : {}),
  };

  if (schedule.allDay) {
    if (schedule.recurrenceType === 'once') {
      const inclusiveEnd = resolveOnceInclusiveEndDate(schedule);
      const calendarEnd =
        inclusiveEnd > schedule.date! ? shiftIsoDate(inclusiveEnd, 1) : undefined;

      return {
        ...base,
        start: schedule.date!,
        end: calendarEnd,
        allDay: true,
      };
    }

    return {
      ...base,
      start: date,
      allDay: true,
    };
  }

  return {
    ...base,
    start: buildScheduleStartIso(date, startTime),
    end: buildScheduleEndIso(date, startTime, endTime),
    allDay: false,
  };
}

function expandWeeklySchedule(
  schedule: UserScheduleRecord,
  rangeStart: string,
  rangeEnd: string
): ExpandedScheduleEvent[] {
  if (
    schedule.daysOfWeek.length === 0 ||
    !schedule.validFrom ||
    !schedule.validUntil
  ) {
    return [];
  }

  const daySet = new Set(schedule.daysOfWeek);
  const excludedSet = new Set(schedule.excludedDates);
  const events: ExpandedScheduleEvent[] = [];

  for (const date of eachDateInRange(rangeStart, rangeEnd)) {
    if (date < schedule.validFrom || date > schedule.validUntil) {
      continue;
    }

    if (!daySet.has(parseIsoDate(date).getDay())) {
      continue;
    }

    if (excludedSet.has(date)) {
      continue;
    }

    const fields = resolveOccurrenceFields(schedule, date);
    const hasOverride = schedule.overrides[date] != null;

    events.push(
      buildExpandedEvent(
        schedule,
        date,
        fields.title,
        fields.startTime,
        fields.endTime,
        hasOverride
      )
    );
  }

  const emittedDates = new Set(events.map((event) => event.date));

  for (const date of Object.keys(schedule.overrides).sort()) {
    if (date < rangeStart || date >= rangeEnd) {
      continue;
    }

    if (date < schedule.validFrom || date > schedule.validUntil) {
      continue;
    }

    if (excludedSet.has(date)) {
      continue;
    }

    if (emittedDates.has(date)) {
      continue;
    }

    const fields = schedule.overrides[date];

    events.push(
      buildExpandedEvent(
        schedule,
        date,
        fields.title,
        fields.startTime,
        fields.endTime,
        true
      )
    );
  }

  return events;
}

function expandOnceSchedule(
  schedule: UserScheduleRecord,
  rangeStart: string,
  rangeEnd: string
): ExpandedScheduleEvent[] {
  if (!schedule.date) {
    return [];
  }

  const inclusiveEnd = resolveOnceInclusiveEndDate(schedule);

  if (schedule.date >= rangeEnd || inclusiveEnd < rangeStart) {
    return [];
  }

  return [
    buildExpandedEvent(
      schedule,
      schedule.date,
      schedule.title,
      schedule.startTime,
      schedule.endTime,
      false
    ),
  ];
}

export function expandSchedulesToEvents(
  schedules: UserScheduleRecord[],
  rangeStart: string,
  rangeEnd: string
): ExpandedScheduleEvent[] {
  const events: ExpandedScheduleEvent[] = [];

  for (const schedule of schedules) {
    if (!scheduleOverlapsRange(schedule, rangeStart, rangeEnd)) {
      continue;
    }

    if (schedule.recurrenceType === 'weekly') {
      events.push(...expandWeeklySchedule(schedule, rangeStart, rangeEnd));
    } else {
      events.push(...expandOnceSchedule(schedule, rangeStart, rangeEnd));
    }
  }

  return events.sort((a, b) => a.start.localeCompare(b.start));
}
