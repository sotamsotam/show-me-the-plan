import { describe, expect, it } from 'vitest';

import {
  buildScheduleEndIso,
  buildScheduleStartIso,
  crossesMidnight,
  durationBetweenIso,
  durationBetweenTimes,
  resolveEndDate,
  validateScheduleTimeRange,
} from './schedule-time';

describe('schedule-time', () => {
  describe('durationBetweenTimes', () => {
    it('handles same-day ranges', () => {
      expect(durationBetweenTimes('14:00', '18:00')).toBe(240);
      expect(durationBetweenTimes('01:00', '03:00')).toBe(120);
    });

    it('handles cross-midnight ranges', () => {
      expect(durationBetweenTimes('23:00', '00:00')).toBe(60);
      expect(durationBetweenTimes('23:00', '02:00')).toBe(180);
    });

    it('rejects ranges outside the study day', () => {
      expect(durationBetweenTimes('23:00', '05:00')).toBeLessThanOrEqual(0);
      expect(durationBetweenTimes('04:00', '05:00')).toBeLessThanOrEqual(0);
    });
  });

  describe('crossesMidnight', () => {
    it('detects midnight crossing by wall clock', () => {
      expect(crossesMidnight('23:00', '00:00')).toBe(true);
      expect(crossesMidnight('23:00', '02:00')).toBe(true);
      expect(crossesMidnight('14:00', '18:00')).toBe(false);
      expect(crossesMidnight('01:00', '03:00')).toBe(false);
    });
  });

  describe('resolveEndDate / buildScheduleEndIso', () => {
    it('keeps the occurrence date for same-day ranges', () => {
      expect(resolveEndDate('2026-06-12', '14:00', '18:00')).toBe('2026-06-12');
      expect(buildScheduleEndIso('2026-06-12', '14:00', '18:00')).toBe(
        '2026-06-12T18:00:00'
      );
    });

    it('uses the next calendar date when crossing midnight', () => {
      expect(resolveEndDate('2026-06-12', '23:00', '02:00')).toBe('2026-06-13');
      expect(buildScheduleStartIso('2026-06-12', '23:00')).toBe(
        '2026-06-12T23:00:00'
      );
      expect(buildScheduleEndIso('2026-06-12', '23:00', '02:00')).toBe(
        '2026-06-13T02:00:00'
      );
      expect(buildScheduleEndIso('2026-06-12', '23:00', '00:00')).toBe(
        '2026-06-13T00:00:00'
      );
    });
  });

  describe('durationBetweenIso', () => {
    it('uses HH:mm only so cross-day ISO pairs still work', () => {
      expect(
        durationBetweenIso('2026-06-12T23:00:00', '2026-06-13T02:00:00')
      ).toBe(180);
    });
  });

  describe('validateScheduleTimeRange', () => {
    it('accepts valid same-day and cross-midnight ranges', () => {
      expect(validateScheduleTimeRange('23:00', '00:00')).toBeNull();
      expect(validateScheduleTimeRange('23:00', '02:00')).toBeNull();
      expect(validateScheduleTimeRange('01:00', '03:00')).toBeNull();
      expect(validateScheduleTimeRange('23:00', '04:00')).toBeNull();
    });

    it('rejects zero duration and study-day overflow', () => {
      expect(validateScheduleTimeRange('10:00', '10:00')).toBe(
        'endTime은 startTime보다 늦어야 합니다.'
      );
      expect(validateScheduleTimeRange('23:00', '05:00')).toBe(
        'endTime은 startTime보다 늦어야 합니다.'
      );
    });

    it('rejects cross-midnight end after 04:00', () => {
      expect(validateScheduleTimeRange('23:00', '04:01')).toBe(
        '자정을 넘기는 일정의 종료 시간은 04:00 이하여야 합니다.'
      );
    });
  });
});
