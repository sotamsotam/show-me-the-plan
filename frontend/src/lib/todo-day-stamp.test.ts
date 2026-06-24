import { describe, expect, it } from 'vitest';

import {
  TODO_DAY_STAMP_DEFAULT_MESSAGE,
  TODO_DAY_STAMP_MAX_MESSAGE_LENGTH,
  countTodoDayStampCharacters,
  validateTodoDayStampMessage,
} from './todo-day-stamp';
import {
  findTodoDayStampForDate,
  formatTodoDayStampDisplayMessage,
  trimTodoDayStampMessage,
} from './todo-day-stamp-helpers';

describe('todo-day-stamp', () => {
  it('validates message length up to 12 characters', () => {
    expect(validateTodoDayStampMessage(TODO_DAY_STAMP_DEFAULT_MESSAGE)).toBeNull();
    expect(validateTodoDayStampMessage('1234567890123')).toBe(
      `도장 문구는 ${TODO_DAY_STAMP_MAX_MESSAGE_LENGTH}자 이내로 입력해 주세요.`
    );
  });

  it('trims input to the maximum character count', () => {
    expect(trimTodoDayStampMessage('1234567890123')).toBe('123456789012');
    expect(countTodoDayStampCharacters('참 잘했어요')).toBe(6);
  });

  it('wraps display text every 6 characters', () => {
    expect(formatTodoDayStampDisplayMessage('참잘했어요오늘도')).toBe(
      '참잘했어요오\n늘도'
    );
  });

  it('finds a stamp for the selected date', () => {
    const stamps = [
      {
        id: 1,
        studentUserId: 10,
        managerUserId: 20,
        date: '2026-06-24',
        message: '참 잘했어요',
        stampedAt: '2026-06-24T12:00:00.000Z',
      },
    ];

    expect(findTodoDayStampForDate(stamps, '2026-06-24')?.message).toBe('참 잘했어요');
    expect(findTodoDayStampForDate(stamps, '2026-06-25')).toBeUndefined();
  });
});
