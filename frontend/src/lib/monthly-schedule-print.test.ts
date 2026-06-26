import { describe, expect, it } from 'vitest';
import {
  buildMonthGridDates,
  buildMonthlyPrintGrid,
  collectMonthViewScheduleEvents,
} from '@/lib/monthly-schedule-print';

describe('buildMonthlyPrintGrid', () => {
  it('builds a monday-start month grid with only all-day month-view events', () => {
    const grid = buildMonthlyPrintGrid({
      anchorDate: '2026-06-15',
      scheduleEvents: [
        {
          id: 'allday-1',
          title: '방학',
          start: '2026-06-10',
          end: '2026-06-13',
          allDay: true,
          classNames: ['user-event-other'],
        },
        {
          id: 'timed-1',
          title: '학원',
          start: '2026-06-10T18:00:00',
          end: '2026-06-10T20:00:00',
          classNames: ['user-event-academy'],
        },
        {
          id: 'single-1',
          title: '개학식',
          start: '2026-06-20',
          allDay: true,
          classNames: ['user-event-fixed'],
        },
      ],
      userName: '테스트',
    });

    expect(grid.rangeLabel).toBe('2026년 6월');
    expect(grid.gridDates[0]).toBe('2026-06-01');
    expect(grid.gridDates.at(-1)).toBe('2026-07-05');
    expect(grid.weekCount).toBe(5);

    const spanningWeek = grid.weeks.find((week) =>
      week.spanSegments.some((segment) => segment.title === '방학')
    );
    expect(spanningWeek?.spanSegments.some((segment) => segment.colSpan === 3)).toBe(true);

    const dayEvent = grid.weeks
      .flatMap((week) => week.days)
      .find((day) => day.date === '2026-06-20')?.events[0];
    expect(dayEvent).toMatchObject({
      title: '개학식',
      backgroundColor: '#F1F3F4',
    });

    expect(
      grid.weeks.flatMap((week) => week.days).some((day) =>
        day.events.some((event) => event.title === '학원')
      )
    ).toBe(false);
  });

  it('filters month-view events the same way as the calendar month view', () => {
    const events = collectMonthViewScheduleEvents([
      {
        id: 'exam',
        title: '중간고사',
        start: '2026-06-15',
        extendedProps: { type: 'school-exam' },
      },
      {
        id: 'timed',
        title: '수학',
        start: '2026-06-15T10:00:00',
        end: '2026-06-15T11:00:00',
        classNames: ['school-event'],
      },
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe('중간고사');
  });
});

describe('buildMonthGridDates', () => {
  it('pads the grid through the sunday of the last week in the month', () => {
    expect(buildMonthGridDates('2026-06-15')).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
      '2026-06-07',
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
      '2026-06-13',
      '2026-06-14',
      '2026-06-15',
      '2026-06-16',
      '2026-06-17',
      '2026-06-18',
      '2026-06-19',
      '2026-06-20',
      '2026-06-21',
      '2026-06-22',
      '2026-06-23',
      '2026-06-24',
      '2026-06-25',
      '2026-06-26',
      '2026-06-27',
      '2026-06-28',
      '2026-06-29',
      '2026-06-30',
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05',
    ]);
  });
});
