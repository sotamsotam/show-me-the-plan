import { describe, expect, it } from 'vitest';

import {
  attachPerformanceBadgesToTimetableEvents,
  buildPerformancePhotoOverlayEvents,
  countUpcomingPerformanceAssessments,
  filterPerformanceAssessments,
  matchPerformanceAssessment,
} from '@/lib/performance-assessment';
import type { UserSchedule } from '@/lib/user-schedule';
import type { EventInput } from '@fullcalendar/core';

function makePerformance(partial: Partial<UserSchedule> = {}): UserSchedule {
  return {
    id: 1,
    title: '수학 수행평가',
    scheduleCategory: 'performance',
    startTime: '00:00',
    endTime: '00:00',
    allDay: true,
    recurrenceType: 'once',
    daysOfWeek: [],
    validFrom: null,
    validUntil: null,
    date: '2026-07-15',
    endDate: null,
    excludedDates: [],
    overrides: {},
    attachments: [
      {
        id: 9,
        url: '/uploads/a.jpg',
        name: 'a.jpg',
        mime: 'image/jpeg',
        size: 100,
        width: 10,
        height: 10,
      },
    ],
    linkedSubject: '수학',
    linkedPeriod: 3,
    ...partial,
  };
}

describe('performance-assessment matching', () => {
  it('filters performance schedules', () => {
    const schedules = [
      makePerformance(),
      makePerformance({
        id: 2,
        scheduleCategory: 'academy',
        title: '학원',
        linkedSubject: null,
        linkedPeriod: null,
      }),
    ];

    expect(filterPerformanceAssessments(schedules)).toHaveLength(1);
  });

  it('matches by date and period', () => {
    const matched = matchPerformanceAssessment(
      [makePerformance()],
      '2026-07-15',
      3,
      '수학'
    );

    expect(matched?.id).toBe(1);
  });

  it('attaches badges to school timetable events', () => {
    const events: EventInput[] = [
      {
        id: 'school-20260715-3',
        title: '수학',
        start: '2026-07-15T10:40:00',
        extendedProps: { type: 'school', period: 3 },
      },
      {
        id: 'school-20260715-4',
        title: '영어',
        start: '2026-07-15T11:40:00',
        extendedProps: { type: 'school', period: 4 },
      },
    ];

    const merged = attachPerformanceBadgesToTimetableEvents(events, [
      makePerformance(),
    ]);

    expect(merged[0]?.extendedProps?.performanceAssessment).toMatchObject({
      scheduleId: 1,
      title: '수학 수행평가',
    });
    expect(merged[0]?.extendedProps?.attachments).toHaveLength(1);
    expect(merged[1]?.extendedProps?.performanceAssessment).toBeUndefined();
  });

  it('builds clickable photo overlay events for study-plan grid', () => {
    const merged = attachPerformanceBadgesToTimetableEvents(
      [
        {
          id: 'school-20260715-3',
          title: '수학',
          start: '2026-07-15T10:40:00',
          extendedProps: { type: 'school', period: 3 },
        },
      ],
      [makePerformance()]
    );

    const overlays = buildPerformancePhotoOverlayEvents(merged);
    expect(overlays).toHaveLength(1);
    expect(overlays[0]?.extendedProps?.type).toBe('performance-photo');
    expect(overlays[0]?.id).toBe('school-20260715-3-perf-photo');
  });

  it('counts upcoming performance assessments regardless of D-day urgency', () => {
    const count = countUpcomingPerformanceAssessments(
      [
        makePerformance({ id: 1, date: '2026-07-15' }),
        makePerformance({ id: 2, date: '2026-07-18' }),
        makePerformance({ id: 3, date: '2026-07-19' }),
        makePerformance({ id: 4, date: '2026-07-14' }),
        makePerformance({ id: 5, date: '2026-09-01' }),
      ],
      '2026-07-15'
    );

    expect(count).toBe(4);
  });
});
