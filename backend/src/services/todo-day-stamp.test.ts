import { describe, expect, it } from 'vitest';

import {
  countMessageCharacters,
  TODO_DAY_STAMP_DEFAULT_MESSAGE,
  TODO_DAY_STAMP_MAX_MESSAGE_LENGTH,
  validateTodoDayStampMessage,
} from './todo-day-stamp';

describe('todo-day-stamp', () => {
  describe('validateTodoDayStampMessage', () => {
    it('accepts messages up to 12 characters', () => {
      expect(validateTodoDayStampMessage(TODO_DAY_STAMP_DEFAULT_MESSAGE)).toBeNull();
      expect(validateTodoDayStampMessage('잘했어')).toBeNull();
      expect(validateTodoDayStampMessage('123456789012')).toBeNull();
    });

    it('rejects empty and over-length messages', () => {
      expect(validateTodoDayStampMessage('')).toBe('message는 필수입니다.');
      expect(validateTodoDayStampMessage('   ')).toBe('message는 필수입니다.');
      expect(validateTodoDayStampMessage('1234567890123')).toBe(
        `message는 ${TODO_DAY_STAMP_MAX_MESSAGE_LENGTH}자 이내여야 합니다.`
      );
    });
  });

  describe('countMessageCharacters', () => {
    it('counts unicode characters rather than code units only', () => {
      expect(countMessageCharacters('참 잘했어요')).toBe(6);
      expect(countMessageCharacters('  참잘했  ')).toBe(3);
    });
  });
});
