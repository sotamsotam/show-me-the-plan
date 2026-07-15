import { describe, expect, it } from 'vitest';

import {
  buildDetachedOnceScheduleCreateData,
  type UserScheduleRecord,
  validateOccurrenceDetachInput,
} from './user-schedule';

function makeWeeklySchedule(
  partial: Partial<UserScheduleRecord> = {}
): UserScheduleRecord {
  return {
    id: 1,
    title: '학원',
    scheduleCategory: 'fixed',
    startTime: '13:00',
    endTime: '15:00',
    allDay: false,
    recurrenceType: 'weekly',
    daysOfWeek: [4],
    validFrom: '2026-07-01',
    validUntil: '2026-08-31',
    date: null,
    endDate: null,
    excludedDates: [],
    overrides: {},
    attachments: [],
    linkedSubject: null,
    linkedPeriod: null,
    ...partial,
  };
}

describe('user-schedule detach', () => {
  it('allows detach to a date that already has a series occurrence', () => {
    const schedule = makeWeeklySchedule();

    expect(
      validateOccurrenceDetachInput(schedule, '2026-07-02', {
        toDate: '2026-07-09',
        title: schedule.title,
        startTime: '14:00',
        endTime: '16:00',
      })
    ).toBeNull();
  });

  it('creates a once schedule on the target date', () => {
    const schedule = makeWeeklySchedule();
    const onceData = buildDetachedOnceScheduleCreateData(schedule, {
      toDate: '2026-07-05',
      title: schedule.title,
      startTime: '14:00',
      endTime: '16:00',
    });

    expect(onceData.recurrenceType).toBe('once');
    expect(onceData.date).toBe('2026-07-05');
    expect(onceData.scheduleCategory).toBe('fixed');
  });
});
