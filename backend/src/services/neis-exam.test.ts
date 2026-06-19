import { describe, expect, it } from 'vitest';

import {
  extractExamEventsFromScheduleRows,
  extractSchoolScheduleEventsFromRows,
  isExamEvent,
  isHolidayScheduleEvent,
} from './neis';

const baseRow = {
  AA_YMD: '20251110',
  EVENT_NM: '2학기 지필평가 1일차',
  EVENT_CNTNT: '',
  SBTR_DD_SC_NM: '행사',
  ONE_GRADE_EVENT_YN: 'N',
  TW_GRADE_EVENT_YN: 'Y',
  THREE_GRADE_EVENT_YN: 'N',
  FR_GRADE_EVENT_YN: '*',
  FIV_GRADE_EVENT_YN: '*',
  SIX_GRADE_EVENT_YN: '*',
};

describe('isExamEvent', () => {
  it('detects exam-related event names', () => {
    expect(isExamEvent('2학기 지필평가 1일차')).toBe(true);
    expect(isExamEvent('중간고사')).toBe(true);
    expect(isExamEvent('기말고사')).toBe(true);
  });

  it('excludes guidance-only event names', () => {
    expect(isExamEvent('시험 안내')).toBe(false);
    expect(isExamEvent('시험 일정 안내')).toBe(false);
  });

  it('detects school-specific exam names such as 회고사 and 차시험', () => {
    expect(isExamEvent('1학기 1회고사')).toBe(true);
    expect(isExamEvent('2학기 2회고사(1,2학년)')).toBe(true);
    expect(isExamEvent('1차시험')).toBe(true);
    expect(isExamEvent('2학기고사')).toBe(true);
  });

  it('excludes unrelated school events', () => {
    expect(isExamEvent('체육대회')).toBe(false);
    expect(isExamEvent('개교기념일')).toBe(false);
  });
});

describe('extractExamEventsFromScheduleRows', () => {
  it('returns exams only for the requested grade', () => {
    const events = extractExamEventsFromScheduleRows([baseRow], '2');

    expect(events).toEqual([
      {
        date: '20251110',
        title: '2학기 지필평가 1일차',
        category: '행사',
      },
    ]);
  });

  it('hides other-grade exams from the student grade', () => {
    expect(extractExamEventsFromScheduleRows([baseRow], '1')).toEqual([]);
    expect(extractExamEventsFromScheduleRows([baseRow], '3')).toEqual([]);
  });

  it('includes all-grade exams when the student grade flag is Y', () => {
    const allGradeRow = {
      ...baseRow,
      EVENT_NM: '전교 지필평가',
      ONE_GRADE_EVENT_YN: 'Y',
      TW_GRADE_EVENT_YN: 'Y',
      THREE_GRADE_EVENT_YN: 'Y',
    };

    expect(extractExamEventsFromScheduleRows([allGradeRow], '1')).toHaveLength(1);
    expect(extractExamEventsFromScheduleRows([allGradeRow], '2')).toHaveLength(1);
    expect(extractExamEventsFromScheduleRows([allGradeRow], '3')).toHaveLength(1);
  });

  it('does not treat asterisk on the student grade as applicable', () => {
    const ambiguousRow = {
      ...baseRow,
      ONE_GRADE_EVENT_YN: '*',
      TW_GRADE_EVENT_YN: 'Y',
      THREE_GRADE_EVENT_YN: 'N',
    };

    expect(extractExamEventsFromScheduleRows([ambiguousRow], '1')).toEqual([]);
    expect(extractExamEventsFromScheduleRows([ambiguousRow], '2')).toHaveLength(1);
  });
});

describe('extractSchoolScheduleEventsFromRows', () => {
  it('includes holidays for the student grade', () => {
    const holidayRow = {
      AA_YMD: '20260606',
      EVENT_NM: '현충일',
      EVENT_CNTNT: '',
      SBTR_DD_SC_NM: '공휴일',
      ONE_GRADE_EVENT_YN: 'Y',
      TW_GRADE_EVENT_YN: 'Y',
      THREE_GRADE_EVENT_YN: 'Y',
      FR_GRADE_EVENT_YN: '*',
      FIV_GRADE_EVENT_YN: '*',
      SIX_GRADE_EVENT_YN: '*',
    };

    const events = extractSchoolScheduleEventsFromRows([holidayRow], '1');

    expect(events).toEqual([
      {
        date: '20260606',
        title: '현충일',
        category: '공휴일',
        kind: 'holiday',
      },
    ]);
  });

  it('detects holiday schedule rows by category or title', () => {
    expect(
      isHolidayScheduleEvent({ EVENT_NM: '여름방학', SBTR_DD_SC_NM: '해당없음' })
    ).toBe(true);
    expect(
      isHolidayScheduleEvent({ EVENT_NM: '토요휴업일', SBTR_DD_SC_NM: '휴업일' })
    ).toBe(true);
    expect(
      isHolidayScheduleEvent({ EVENT_NM: '1차시험', SBTR_DD_SC_NM: '해당없음' })
    ).toBe(false);
  });

  it('excludes saturday off-day labels from calendar schedule events', () => {
    const saturdayOffRow = {
      AA_YMD: '20260613',
      EVENT_NM: '토요휴업일',
      EVENT_CNTNT: '',
      SBTR_DD_SC_NM: '휴업일',
      ONE_GRADE_EVENT_YN: 'Y',
      TW_GRADE_EVENT_YN: 'Y',
      THREE_GRADE_EVENT_YN: 'Y',
      FR_GRADE_EVENT_YN: '*',
      FIV_GRADE_EVENT_YN: '*',
      SIX_GRADE_EVENT_YN: '*',
    };

    expect(extractSchoolScheduleEventsFromRows([saturdayOffRow], '1')).toEqual([]);
  });
});
