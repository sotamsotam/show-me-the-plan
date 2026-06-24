import { appendStudentUserId } from '@/lib/manager-student';

export const TODO_DAY_STAMP_MAX_MESSAGE_LENGTH = 12;
export const TODO_DAY_STAMP_DEFAULT_MESSAGE = '참 잘했어요';

export interface TodoDayStamp {
  id: number;
  studentUserId: number;
  managerUserId: number;
  date: string;
  message: string;
  stampedAt: string;
}

export function countTodoDayStampCharacters(message: string): number {
  return [...message.trim()].length;
}

export function validateTodoDayStampMessage(message: string): string | null {
  const trimmed = message.trim();

  if (!trimmed) {
    return '도장 문구를 입력해 주세요.';
  }

  if (countTodoDayStampCharacters(trimmed) > TODO_DAY_STAMP_MAX_MESSAGE_LENGTH) {
    return `도장 문구는 ${TODO_DAY_STAMP_MAX_MESSAGE_LENGTH}자 이내로 입력해 주세요.`;
  }

  return null;
}

export async function fetchTodoDayStampsInRange(options: {
  start: string;
  end: string;
  studentUserId?: number | null;
}): Promise<{ ok: true; stamps: TodoDayStamp[] } | { ok: false; error: string }> {
  const params = appendStudentUserId(
    new URLSearchParams({
      start: options.start,
      end: options.end,
    }),
    options.studentUserId ?? null
  );

  const res = await fetch(`/api/todo-day-stamps?${params}`, {
    credentials: 'include',
  });
  const data = (await res.json()) as {
    stamps?: TodoDayStamp[];
    error?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      error: data.error ?? '확인도장을 불러오지 못했습니다.',
    };
  }

  return {
    ok: true,
    stamps: data.stamps ?? [],
  };
}

export async function upsertTodoDayStamp(options: {
  date: string;
  message: string;
  studentUserId: number;
}): Promise<{ ok: true; stamp: TodoDayStamp } | { ok: false; error: string }> {
  const params = appendStudentUserId(new URLSearchParams(), options.studentUserId);
  const query = params.toString();
  const url = query
    ? `/api/todo-day-stamps/${options.date}?${query}`
    : `/api/todo-day-stamps/${options.date}`;

  const res = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: options.message.trim() }),
  });
  const data = (await res.json()) as {
    stamp?: TodoDayStamp;
    error?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      error: data.error ?? '확인도장 저장에 실패했습니다.',
    };
  }

  if (!data.stamp) {
    return {
      ok: false,
      error: '확인도장 저장에 실패했습니다.',
    };
  }

  return {
    ok: true,
    stamp: data.stamp,
  };
}
