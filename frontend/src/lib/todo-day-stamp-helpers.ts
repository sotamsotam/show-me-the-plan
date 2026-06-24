import {
  TODO_DAY_STAMP_MAX_MESSAGE_LENGTH,
  type TodoDayStamp,
} from '@/lib/todo-day-stamp';

export function findTodoDayStampForDate(
  stamps: TodoDayStamp[],
  date: string
): TodoDayStamp | undefined {
  return stamps.find((stamp) => stamp.date === date);
}

export function trimTodoDayStampMessage(message: string): string {
  return [...message].slice(0, TODO_DAY_STAMP_MAX_MESSAGE_LENGTH).join('');
}

export const TODO_DAY_STAMP_DISPLAY_LINE_LENGTH = 6;

export function formatTodoDayStampDisplayMessage(message: string): string {
  const chars = [...message.trim()];

  if (chars.length === 0) {
    return '';
  }

  const lines: string[] = [];

  for (let index = 0; index < chars.length; index += TODO_DAY_STAMP_DISPLAY_LINE_LENGTH) {
    lines.push(
      chars.slice(index, index + TODO_DAY_STAMP_DISPLAY_LINE_LENGTH).join('')
    );
  }

  return lines.join('\n');
}
