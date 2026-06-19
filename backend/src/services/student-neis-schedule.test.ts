import { describe, expect, it } from 'vitest';
import {
  buildOtherStudentTimetableResponse,
  createEmptyNeisScheduleBundle,
  shouldSkipNeisScheduleFetch,
} from './student-neis-schedule';

describe('student NEIS schedule access', () => {
  it('skips NEIS fetch for other students', () => {
    expect(shouldSkipNeisScheduleFetch('other')).toBe(true);
    expect(shouldSkipNeisScheduleFetch('high')).toBe(false);
  });

  it('returns an empty schedule bundle', () => {
    expect(createEmptyNeisScheduleBundle()).toEqual({
      entries: [],
      scheduleEvents: [],
    });
  });

  it('builds empty timetable API response for other students', () => {
    expect(buildOtherStudentTimetableResponse({ schoolLevel: 'other' })).toEqual({
      profile: { schoolLevel: 'other' },
      entries: [],
      scheduleEvents: [],
    });
  });
});
