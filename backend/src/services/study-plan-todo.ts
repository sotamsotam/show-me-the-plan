import {
  buildScheduleEndIso,
  buildScheduleStartIso,
  isValidTime,
  normalizeTime,
  validateScheduleTimeRange,
} from './schedule-time';

export type RecurrenceType = 'weekly' | 'once';

import {
  LEGACY_STUDY_PLAN_SUBJECTS,
  type LegacyStudyPlanSubject,
  type PlanSubjectKey,
  type UserSubject,
} from './user-subject';
import {
  buildAllowedPlanSubjectIds,
  isAllowedPlanSubject,
  parseUserSubjects,
} from './user-subject-validation';
import { normalizeWeeklyPlanSource, type WeeklyPlanSource } from './weekly-plan-source';

export {
  buildAllowedPlanSubjectIds,
  isAllowedPlanSubject,
  parseUserSubjects,
} from './user-subject-validation';

export type { LegacyStudyPlanSubject, PlanSubjectKey } from './user-subject';

/** @deprecated LegacyStudyPlanSubject와 동일. 하위 호환용 별칭 */
export type StudyPlanSubject = LegacyStudyPlanSubject;

export const STUDY_PLAN_SUBJECTS = LEGACY_STUDY_PLAN_SUBJECTS;

export interface StudyPlanOccurrenceOverride {
  title: string;
  startTime: string;
  endTime: string;
}

export interface OccurrenceOverrideInput {
  title?: string;
  startTime?: string;
  endTime?: string;
}

export type ExecutionStatus = 'completed' | 'incomplete' | 'partial';
export type ExecutionInputMode = 'direct' | 'timer';

export interface StudyPlanExecutionRecord {
  status: ExecutionStatus;
  executedStartTime?: string;
  executedEndTime?: string;
  inputMode?: ExecutionInputMode;
  achievementLevel?: number;
}

export interface ExecutionRecordInput {
  status?: ExecutionStatus;
  executedStartTime?: string;
  executedEndTime?: string;
  inputMode?: ExecutionInputMode;
  achievementLevel?: number;
}

export interface StudyPlanTodoInput {
  subject?: PlanSubjectKey;
  title?: string;
  startTime?: string;
  endTime?: string;
  recurrenceType?: RecurrenceType;
  daysOfWeek?: number[];
  validFrom?: string;
  validUntil?: string;
  date?: string;
  excludedDates?: string[];
  overrides?: Record<string, StudyPlanOccurrenceOverride>;
  weeklyPlanSource?: WeeklyPlanSource | null;
}

export interface StudyPlanTodoRecord {
  id: number;
  subject: PlanSubjectKey;
  title: string;
  startTime: string;
  endTime: string;
  recurrenceType: RecurrenceType;
  daysOfWeek: number[];
  validFrom: string | null;
  validUntil: string | null;
  date: string | null;
  excludedDates: string[];
  overrides: Record<string, StudyPlanOccurrenceOverride>;
  executionRecords: Record<string, StudyPlanExecutionRecord>;
  weeklyPlanSource: WeeklyPlanSource | null;
}

export interface ExpandedStudyPlanTodoEvent {
  id: string;
  todoId: number;
  subject: PlanSubjectKey;
  title: string;
  start: string;
  end: string;
  date: string;
  recurrenceType: RecurrenceType;
  hasOverride: boolean;
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

export function normalizeDaysOfWeek(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .map((item) => Number(item))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  )].sort((a, b) => a - b);
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
): Record<string, StudyPlanOccurrenceOverride> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const overrides: Record<string, StudyPlanOccurrenceOverride> = {};

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

const EXECUTION_STATUSES: ExecutionStatus[] = ['completed', 'incomplete', 'partial'];
const EXECUTION_INPUT_MODES: ExecutionInputMode[] = ['direct', 'timer'];

export function normalizeExecutionRecords(
  value: unknown
): Record<string, StudyPlanExecutionRecord> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const records: Record<string, StudyPlanExecutionRecord> = {};

  for (const [rawDate, rawRecord] of Object.entries(value)) {
    const date = rawDate.slice(0, 10);
    if (!isValidIsoDate(date) || !rawRecord || typeof rawRecord !== 'object') {
      continue;
    }

    const entry = rawRecord as Record<string, unknown>;
    const status = entry.status;

    if (
      typeof status !== 'string' ||
      !EXECUTION_STATUSES.includes(status as ExecutionStatus)
    ) {
      continue;
    }

    if (status === 'incomplete') {
      records[date] = { status: 'incomplete' };
      continue;
    }

    const executedStartTime =
      typeof entry.executedStartTime === 'string'
        ? normalizeTime(entry.executedStartTime)
        : '';
    const executedEndTime =
      typeof entry.executedEndTime === 'string'
        ? normalizeTime(entry.executedEndTime)
        : '';
    const inputMode = entry.inputMode;
    const achievementLevel = Number(entry.achievementLevel);

    if (
      !isValidTime(executedStartTime) ||
      !isValidTime(executedEndTime) ||
      validateScheduleTimeRange(executedStartTime, executedEndTime, {
        startLabel: 'executedStartTime',
        endLabel: 'executedEndTime',
      }) ||
      typeof inputMode !== 'string' ||
      !EXECUTION_INPUT_MODES.includes(inputMode as ExecutionInputMode) ||
      !Number.isInteger(achievementLevel) ||
      achievementLevel < 1 ||
      achievementLevel > 10
    ) {
      continue;
    }

    records[date] = {
      status: status as ExecutionStatus,
      executedStartTime,
      executedEndTime,
      inputMode: inputMode as ExecutionInputMode,
      achievementLevel,
    };
  }

  return records;
}

function normalizeSubject(value: unknown): PlanSubjectKey {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return 'other';
}

export function toStudyPlanTodoRecord(raw: Record<string, unknown>): StudyPlanTodoRecord {
  return {
    id: Number(raw.id),
    subject: normalizeSubject(raw.subject),
    title: String(raw.title),
    startTime: normalizeTime(String(raw.startTime)),
    endTime: normalizeTime(String(raw.endTime)),
    recurrenceType: raw.recurrenceType as RecurrenceType,
    daysOfWeek: normalizeDaysOfWeek(raw.daysOfWeek),
    validFrom: normalizeDateValue(raw.validFrom),
    validUntil: normalizeDateValue(raw.validUntil),
    date: normalizeDateValue(raw.date),
    excludedDates: normalizeExcludedDates(raw.excludedDates),
    overrides: normalizeOverrides(raw.overrides),
    executionRecords: normalizeExecutionRecords(raw.executionRecords),
    weeklyPlanSource: normalizeWeeklyPlanSource(raw.weeklyPlanSource),
  };
}

export interface StudyPlanTodoResponse {
  id: number;
  subject: PlanSubjectKey;
  title: string;
  startTime: string;
  endTime: string;
  recurrenceType: RecurrenceType;
  daysOfWeek: number[];
  validFrom: string | null;
  validUntil: string | null;
  date: string | null;
  excludedDates: string[];
  overrides: Record<string, StudyPlanOccurrenceOverride>;
  executionRecords: Record<string, StudyPlanExecutionRecord>;
  weeklyPlanSource: WeeklyPlanSource | null;
}

export interface StudyPlanTodoSerializeRange {
  start: string;
  end: string;
}

/** API range query: [start, end) — end is exclusive, same as event expansion. */
export function isDateInApiRange(
  date: string,
  rangeStart: string,
  rangeEnd: string
): boolean {
  return date >= rangeStart && date < rangeEnd;
}

export function filterRecordMapByDateRange<T>(
  records: Record<string, T>,
  rangeStart: string,
  rangeEnd: string
): Record<string, T> {
  const filtered: Record<string, T> = {};

  for (const [date, value] of Object.entries(records)) {
    if (isDateInApiRange(date, rangeStart, rangeEnd)) {
      filtered[date] = value;
    }
  }

  return filtered;
}

export function filterExcludedDatesInRange(
  dates: string[],
  rangeStart: string,
  rangeEnd: string
): string[] {
  return dates.filter((date) => isDateInApiRange(date, rangeStart, rangeEnd));
}

export function serializeStudyPlanTodo(
  raw: Record<string, unknown>,
  range?: StudyPlanTodoSerializeRange
): StudyPlanTodoResponse {
  const todo = toStudyPlanTodoRecord(raw);

  return {
    id: todo.id,
    subject: todo.subject,
    title: todo.title,
    startTime: todo.startTime,
    endTime: todo.endTime,
    recurrenceType: todo.recurrenceType,
    daysOfWeek: todo.daysOfWeek,
    validFrom: todo.validFrom,
    validUntil: todo.validUntil,
    date: todo.date,
    excludedDates: range
      ? filterExcludedDatesInRange(todo.excludedDates, range.start, range.end)
      : todo.excludedDates,
    overrides: range
      ? filterRecordMapByDateRange(todo.overrides, range.start, range.end)
      : todo.overrides,
    executionRecords: range
      ? filterRecordMapByDateRange(todo.executionRecords, range.start, range.end)
      : todo.executionRecords,
    weeklyPlanSource: todo.weeklyPlanSource,
  };
}

export const STUDY_PLAN_FIND_INCLUDES = ['events', 'meta', 'executions'] as const;
export type StudyPlanFindInclude = (typeof STUDY_PLAN_FIND_INCLUDES)[number];

export const DEFAULT_STUDY_PLAN_FIND_INCLUDES: StudyPlanFindInclude[] = [
  'events',
  'meta',
  'executions',
];

export function parseStudyPlanFindInclude(
  raw: unknown
): StudyPlanFindInclude[] | { error: string } {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return [...DEFAULT_STUDY_PLAN_FIND_INCLUDES];
  }

  const parts = String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return [...DEFAULT_STUDY_PLAN_FIND_INCLUDES];
  }

  const invalid = parts.filter(
    (part) => !STUDY_PLAN_FIND_INCLUDES.includes(part as StudyPlanFindInclude)
  );

  if (invalid.length > 0) {
    return {
      error: 'include는 events, meta, executions 중에서만 지정할 수 있습니다.',
    };
  }

  if (parts.includes('executions') && !parts.includes('meta')) {
    return {
      error: 'executions를 포함하려면 meta도 포함해야 합니다.',
    };
  }

  const unique: StudyPlanFindInclude[] = [];

  for (const part of parts) {
    const flag = part as StudyPlanFindInclude;

    if (!unique.includes(flag)) {
      unique.push(flag);
    }
  }

  return unique;
}

export interface StudyPlanFindInRangeResponse {
  todos?: StudyPlanTodoResponse[];
  events?: ExpandedStudyPlanTodoEvent[];
}

export function buildFindInRangeResponse(
  includes: StudyPlanFindInclude[],
  todos: StudyPlanTodoResponse[],
  events: ExpandedStudyPlanTodoEvent[]
): StudyPlanFindInRangeResponse {
  const response: StudyPlanFindInRangeResponse = {};

  if (includes.includes('events')) {
    response.events = events;
  }

  if (includes.includes('meta')) {
    const includeExecutions = includes.includes('executions');

    response.todos = todos.map((todo) =>
      includeExecutions ? todo : { ...todo, executionRecords: {} }
    );
  }

  return response;
}

export function todoOverlapsRange(
  todo: StudyPlanTodoRecord,
  rangeStart: string,
  rangeEnd: string
): boolean {
  if (todo.recurrenceType === 'once') {
    if (!todo.date) {
      return false;
    }

    return todo.date >= rangeStart && todo.date < rangeEnd;
  }

  if (!todo.validFrom || !todo.validUntil) {
    return false;
  }

  return todo.validFrom < rangeEnd && todo.validUntil >= rangeStart;
}

export function buildTodoOverlapWhereClause(
  userId: number,
  rangeStart: string,
  rangeEnd: string
): Record<string, unknown> {
  return {
    user: userId,
    $or: [
      {
        recurrenceType: 'once',
        date: {
          $gte: rangeStart,
          $lt: rangeEnd,
        },
      },
      {
        recurrenceType: 'weekly',
        validFrom: { $lt: rangeEnd },
        validUntil: { $gte: rangeStart },
      },
    ],
  };
}

export function collectStudyPlanTodoTitles(
  todos: StudyPlanTodoRecord[],
  subject?: PlanSubjectKey
): string[] {
  const titles = new Set<string>();

  for (const todo of todos) {
    if (subject && todo.subject !== subject) {
      continue;
    }

    const baseTitle = todo.title.trim();

    if (baseTitle) {
      titles.add(baseTitle);
    }

    for (const override of Object.values(todo.overrides)) {
      const overrideTitle = override.title.trim();

      if (overrideTitle) {
        titles.add(overrideTitle);
      }
    }
  }

  return [...titles].sort((a, b) => a.localeCompare(b, 'ko'));
}

export function filterTitlesByQuery(titles: string[], query: string): string[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return titles;
  }

  return titles.filter((title) => title.includes(trimmed));
}

export function isValidOccurrenceDate(todo: StudyPlanTodoRecord, date: string): boolean {
  if (todo.recurrenceType !== 'weekly') {
    return false;
  }

  if (!todo.validFrom || !todo.validUntil) {
    return false;
  }

  if (date < todo.validFrom || date > todo.validUntil) {
    return false;
  }

  return todo.daysOfWeek.includes(parseIsoDate(date).getDay());
}

function hasActiveOccurrenceOnDate(todo: StudyPlanTodoRecord, date: string): boolean {
  if (todo.excludedDates.includes(date)) {
    return false;
  }

  if (todo.overrides[date]) {
    return true;
  }

  return isValidOccurrenceDate(todo, date);
}

export function isOccurrenceEditableSource(
  todo: StudyPlanTodoRecord,
  date: string
): boolean {
  if (todo.excludedDates.includes(date)) {
    return false;
  }

  if (todo.overrides[date]) {
    return true;
  }

  return isValidOccurrenceDate(todo, date);
}

export function validateOccurrenceMoveTarget(
  todo: StudyPlanTodoRecord,
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
  todo: StudyPlanTodoRecord,
  fromDate: string,
  toDate: string,
  input: OccurrenceOverrideInput
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
    title: input.title!.trim(),
    startTime: normalizeTime(input.startTime!),
    endTime: normalizeTime(input.endTime!),
  };

  return {
    excludedDates: normalizeExcludedDates(excludedDates),
    overrides,
  };
}

export function isValidExecutionDate(todo: StudyPlanTodoRecord, date: string): boolean {
  if (!isValidIsoDate(date)) {
    return false;
  }

  if (todo.recurrenceType === 'once') {
    return todo.date === date;
  }

  return isValidOccurrenceDate(todo, date);
}

export function resolveOccurrenceFields(
  todo: StudyPlanTodoRecord,
  date: string
): StudyPlanOccurrenceOverride {
  const override = todo.overrides[date];

  if (override) {
    return override;
  }

  return {
    title: todo.title,
    startTime: todo.startTime,
    endTime: todo.endTime,
  };
}

export function validateOccurrenceOverride(input: OccurrenceOverrideInput): string | null {
  if (!input.title?.trim()) {
    return 'title은 필수입니다.';
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

export function buildOccurrenceExclusionUpdate(todo: StudyPlanTodoRecord, date: string) {
  const overrides = { ...todo.overrides };
  delete overrides[date];

  return {
    excludedDates: normalizeExcludedDates([...todo.excludedDates, date]),
    overrides,
  };
}

export function validateExecutionInput(input: ExecutionRecordInput): string | null {
  if (
    !input.status ||
    !EXECUTION_STATUSES.includes(input.status as ExecutionStatus)
  ) {
    return 'status는 completed, incomplete, partial 중 하나여야 합니다.';
  }

  if (input.status === 'incomplete') {
    return null;
  }

  if (!input.executedStartTime || !isValidTime(input.executedStartTime)) {
    return 'executedStartTime은 HH:mm 형식이어야 합니다.';
  }

  if (!input.executedEndTime || !isValidTime(input.executedEndTime)) {
    return 'executedEndTime은 HH:mm 형식이어야 합니다.';
  }

  const executionTimeError = validateScheduleTimeRange(
    input.executedStartTime,
    input.executedEndTime,
    {
      startLabel: 'executedStartTime',
      endLabel: 'executedEndTime',
    }
  );
  if (executionTimeError) {
    return executionTimeError;
  }

  if (
    !input.inputMode ||
    !EXECUTION_INPUT_MODES.includes(input.inputMode as ExecutionInputMode)
  ) {
    return 'inputMode는 direct 또는 timer여야 합니다.';
  }

  const level = Number(input.achievementLevel);

  if (!Number.isInteger(level) || level < 1 || level > 10) {
    return 'achievementLevel은 1~10 사이 정수여야 합니다.';
  }

  return null;
}

export function buildExecutionUpdate(
  todo: StudyPlanTodoRecord,
  date: string,
  input: ExecutionRecordInput
): { executionRecords: Record<string, StudyPlanExecutionRecord> } {
  if (input.status === 'incomplete') {
    return {
      executionRecords: {
        ...todo.executionRecords,
        [date]: { status: 'incomplete' },
      },
    };
  }

  return {
    executionRecords: {
      ...todo.executionRecords,
      [date]: {
        status: input.status!,
        executedStartTime: normalizeTime(input.executedStartTime!),
        executedEndTime: normalizeTime(input.executedEndTime!),
        inputMode: input.inputMode!,
        achievementLevel: Number(input.achievementLevel),
      },
    },
  };
}

export function buildOccurrenceOverrideUpdate(
  todo: StudyPlanTodoRecord,
  date: string,
  input: OccurrenceOverrideInput
): { excludedDates: string[]; overrides: Record<string, StudyPlanOccurrenceOverride> } {
  return {
    excludedDates: todo.excludedDates.filter((value) => value !== date),
    overrides: {
      ...todo.overrides,
      [date]: {
        title: input.title!.trim(),
        startTime: normalizeTime(input.startTime!),
        endTime: normalizeTime(input.endTime!),
      },
    },
  };
}

export function validateStudyPlanTodoInput(
  input: StudyPlanTodoInput,
  options: {
    partial?: boolean;
    allowedSubjectIds?: Set<PlanSubjectKey>;
    profileSubjects?: UserSubject[] | null;
  } = {}
): string | null {
  const partial = options.partial ?? false;
  const has = (key: keyof StudyPlanTodoInput) => input[key] !== undefined;
  const allowedSubjectIds =
    options.allowedSubjectIds ??
    buildAllowedPlanSubjectIds(options.profileSubjects ?? null);

  if (!partial || has('subject')) {
    if (!input.subject || !isAllowedPlanSubject(input.subject, allowedSubjectIds)) {
      return 'subject는 유효한 과목 값이어야 합니다.';
    }
  }

  if (!partial || has('title')) {
    if (!input.title?.trim()) {
      return 'title은 필수입니다.';
    }
  }

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
  }

  if (!partial || has('weeklyPlanSource')) {
    if (input.weeklyPlanSource !== undefined && input.weeklyPlanSource !== null) {
      if (!normalizeWeeklyPlanSource(input.weeklyPlanSource)) {
        return 'weeklyPlanSource 형식이 올바르지 않습니다.';
      }
    }
  }

  return null;
}

export function buildStudyPlanTodoData(input: StudyPlanTodoInput): Record<string, unknown> {
  const recurrenceType = input.recurrenceType!;
  const data: Record<string, unknown> = {
    subject: input.subject!,
    title: input.title!.trim(),
    startTime: normalizeTime(input.startTime!),
    endTime: normalizeTime(input.endTime!),
    recurrenceType,
    daysOfWeek: null,
    validFrom: null,
    validUntil: null,
    date: null,
    excludedDates: [],
    overrides: {},
    executionRecords: {},
  };

  if (recurrenceType === 'weekly') {
    data.daysOfWeek = normalizeDaysOfWeek(input.daysOfWeek);
    data.validFrom = input.validFrom;
    data.validUntil = input.validUntil;
    data.excludedDates = normalizeExcludedDates(input.excludedDates ?? []);
    data.overrides = normalizeOverrides(input.overrides ?? {});
  } else {
    data.date = input.date;
  }

  if (input.weeklyPlanSource !== undefined) {
    data.weeklyPlanSource =
      input.weeklyPlanSource === null
        ? null
        : normalizeWeeklyPlanSource(input.weeklyPlanSource);
  }

  return data;
}

function expandWeeklyTodo(
  todo: StudyPlanTodoRecord,
  rangeStart: string,
  rangeEnd: string
): ExpandedStudyPlanTodoEvent[] {
  if (todo.daysOfWeek.length === 0 || !todo.validFrom || !todo.validUntil) {
    return [];
  }

  const daySet = new Set(todo.daysOfWeek);
  const excludedSet = new Set(todo.excludedDates);
  const events: ExpandedStudyPlanTodoEvent[] = [];

  for (const date of eachDateInRange(rangeStart, rangeEnd)) {
    if (date < todo.validFrom || date > todo.validUntil) {
      continue;
    }

    if (!daySet.has(parseIsoDate(date).getDay())) {
      continue;
    }

    if (excludedSet.has(date)) {
      continue;
    }

    const fields = resolveOccurrenceFields(todo, date);
    const hasOverride = todo.overrides[date] != null;

    events.push({
      id: `study-plan-${todo.id}-${date}`,
      todoId: todo.id,
      subject: todo.subject,
      title: fields.title,
      start: buildScheduleStartIso(date, fields.startTime),
      end: buildScheduleEndIso(date, fields.startTime, fields.endTime),
      date,
      recurrenceType: todo.recurrenceType,
      hasOverride,
    });
  }

  const emittedDates = new Set(events.map((event) => event.date));

  for (const date of Object.keys(todo.overrides).sort()) {
    if (date < rangeStart || date >= rangeEnd) {
      continue;
    }

    if (date < todo.validFrom || date > todo.validUntil) {
      continue;
    }

    if (excludedSet.has(date)) {
      continue;
    }

    if (emittedDates.has(date)) {
      continue;
    }

    const fields = todo.overrides[date];

    events.push({
      id: `study-plan-${todo.id}-${date}`,
      todoId: todo.id,
      subject: todo.subject,
      title: fields.title,
      start: buildScheduleStartIso(date, fields.startTime),
      end: buildScheduleEndIso(date, fields.startTime, fields.endTime),
      date,
      recurrenceType: todo.recurrenceType,
      hasOverride: true,
    });
  }

  return events;
}

function expandOnceTodo(
  todo: StudyPlanTodoRecord,
  rangeStart: string,
  rangeEnd: string
): ExpandedStudyPlanTodoEvent[] {
  if (!todo.date) {
    return [];
  }

  if (todo.date < rangeStart || todo.date >= rangeEnd) {
    return [];
  }

  return [
    {
      id: `study-plan-${todo.id}-${todo.date}`,
      todoId: todo.id,
      subject: todo.subject,
      title: todo.title,
      start: buildScheduleStartIso(todo.date, todo.startTime),
      end: buildScheduleEndIso(todo.date, todo.startTime, todo.endTime),
      date: todo.date,
      recurrenceType: todo.recurrenceType,
      hasOverride: false,
    },
  ];
}

export function expandStudyPlanTodosToEvents(
  todos: StudyPlanTodoRecord[],
  rangeStart: string,
  rangeEnd: string
): ExpandedStudyPlanTodoEvent[] {
  const events: ExpandedStudyPlanTodoEvent[] = [];

  for (const todo of todos) {
    if (!todoOverlapsRange(todo, rangeStart, rangeEnd)) {
      continue;
    }

    if (todo.recurrenceType === 'weekly') {
      events.push(...expandWeeklyTodo(todo, rangeStart, rangeEnd));
    } else {
      events.push(...expandOnceTodo(todo, rangeStart, rangeEnd));
    }
  }

  return events.sort((a, b) => a.start.localeCompare(b.start));
}
