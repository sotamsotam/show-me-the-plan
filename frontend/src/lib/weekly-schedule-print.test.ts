import { describe, expect, it } from 'vitest';
import { buildWeeklyPrintGrid } from '@/lib/weekly-schedule-print';

describe('buildWeeklyPrintGrid', () => {
  it('builds dynamic rows and study-plan checkboxes for the visible week', () => {
    const grid = buildWeeklyPrintGrid({
      anchorDate: '2026-06-09',
      scheduleEvents: [
        {
          id: 'school-1',
          title: '수학',
          start: '2026-06-09T10:00:00',
          end: '2026-06-09T11:00:00',
          classNames: ['school-event'],
        },
      ],
      studyPlanEvents: [
        {
          id: 'todo-1-2026-06-10',
          todoId: 1,
          subject: 'english',
          title: '단어 암기',
          start: '2026-06-10T19:00:00',
          end: '2026-06-10T20:00:00',
          date: '2026-06-10',
          recurrenceType: 'weekly',
          hasOverride: false,
        },
      ],
      studyPlanTodos: [
        {
          id: 1,
          subject: 'english',
          title: '단어 암기',
          startTime: '19:00',
          endTime: '20:00',
          recurrenceType: 'weekly',
          daysOfWeek: [2],
          validFrom: null,
          validUntil: null,
          date: null,
          excludedDates: [],
          overrides: {},
          executionRecords: {
            '2026-06-10': { status: 'completed' },
          },
        },
      ],
      userName: '테스트',
    });

    expect(grid.weekDates).toEqual([
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
      '2026-06-13',
      '2026-06-14',
    ]);
    expect(grid.timeRows).toHaveLength(2);
    expect(grid.dayColumns[1]?.allDayItems).toEqual([]);
    expect(grid.dayColumns[2]?.rows[1]?.items[0]).toMatchObject({
      title: '[영어] 단어 암기',
      showCheckbox: true,
      checked: true,
      backgroundColor: '#E8F0FE',
    });
    expect(grid.dayColumns[2]?.rows[1]?.backgroundColor).toBe('#E8F0FE');
    expect(grid.dayColumns[1]?.rows[0]?.items[0]).toMatchObject({
      title: '수학',
      showCheckbox: false,
      checked: false,
      backgroundColor: '#E8F0FE',
    });
    expect(grid.dayColumns[1]?.rows[0]?.backgroundColor).toBe('#E8F0FE');
  });
});
