export const TODO_DAY_STAMP_UID = 'api::todo-day-stamp.todo-day-stamp' as const;

export const TODO_DAY_STAMP_MAX_MESSAGE_LENGTH = 12;
export const TODO_DAY_STAMP_DEFAULT_MESSAGE = '참 잘했어요';

export interface TodoDayStampRecord {
  id: number;
  studentUserId: number;
  managerUserId: number;
  date: string;
  message: string;
  stampedAt: string;
}

export interface TodoDayStampInput {
  message: string;
}

function normalizeDateValue(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return String(value ?? '').slice(0, 10);
}

function normalizeDateTimeValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value ?? '');
}

function readRelationUserId(value: unknown): number {
  if (value && typeof value === 'object' && 'id' in value) {
    return Number((value as { id: number }).id);
  }

  return Number(value);
}

export function parseTodoDayStampDate(raw: string): string | null {
  const date = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

export function countMessageCharacters(message: string): number {
  return [...message.trim()].length;
}

export function validateTodoDayStampMessage(message: string): string | null {
  const trimmed = message.trim();

  if (!trimmed) {
    return 'message는 필수입니다.';
  }

  if (countMessageCharacters(trimmed) > TODO_DAY_STAMP_MAX_MESSAGE_LENGTH) {
    return `message는 ${TODO_DAY_STAMP_MAX_MESSAGE_LENGTH}자 이내여야 합니다.`;
  }

  return null;
}

export function serializeTodoDayStamp(row: Record<string, unknown>): TodoDayStampRecord {
  return {
    id: Number(row.id),
    studentUserId: readRelationUserId(row.student),
    managerUserId: readRelationUserId(row.manager),
    date: normalizeDateValue(row.date),
    message: String(row.message ?? ''),
    stampedAt: normalizeDateTimeValue(row.stampedAt),
  };
}

export function buildTodoDayStampRangeWhere(
  studentUserId: number,
  rangeStart: string,
  rangeEnd: string
) {
  return {
    student: studentUserId,
    date: {
      $gte: rangeStart,
      $lt: rangeEnd,
    },
  };
}
