import { describe, expect, it } from 'vitest';

import { expandSchedulesToEvents } from './user-schedule';
import type { UserScheduleRecord } from './user-schedule';

function buildAllDayOnceSchedule(
  overrides: Partial<UserScheduleRecord> = {}
): UserScheduleRecord {
  return {
    id: 1,
    title: '수행평가',
    scheduleCategory: 'other',
    startTime: '00:00',
    endTime: '23:59',
    allDay: true,
    recurrenceType: 'once',
    daysOfWeek: [],
    validFrom: null,
    validUntil: null,
    date: '2026-06-12',
    endDate: null,
    excludedDates: [],
    overrides: {},
    attachments: [
      {
        id: 9,
        url: '/uploads/perf.jpg',
        name: 'perf.jpg',
        mime: 'image/jpeg',
        size: 1024,
        width: 800,
        height: 600,
      },
    ],
    ...overrides,
  };
}

describe('user-schedule attachments expansion', () => {
  it('includes attachments on expanded all-day events', () => {
    const events = expandSchedulesToEvents([buildAllDayOnceSchedule()], '2026-06-01', '2026-06-30');

    expect(events).toHaveLength(1);
    expect(events[0]?.attachments).toEqual([
      {
        id: 9,
        url: '/uploads/perf.jpg',
        name: 'perf.jpg',
        mime: 'image/jpeg',
        size: 1024,
        width: 800,
        height: 600,
      },
    ]);
  });

  it('omits attachments on timed events', () => {
    const events = expandSchedulesToEvents(
      [
        buildAllDayOnceSchedule({
          allDay: false,
          startTime: '14:00',
          endTime: '15:00',
        }),
      ],
      '2026-06-01',
      '2026-06-30'
    );

    expect(events[0]?.attachments).toBeUndefined();
  });
});
