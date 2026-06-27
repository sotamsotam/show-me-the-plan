import { describe, expect, it } from 'vitest';

import {
  buildWeeklyPlanTodoCreatePayload,
  isYmdInInclusiveRange,
  type WeeklyPlanPlacementContext,
} from './exam-prep-weekly-plan-placement';

const samplePlacement: WeeklyPlanPlacementContext = {
  kind: 'exam-prep',
  roundSlot: 'sem1-r1',
  weekNumber: 2,
  weekStart: '20260511',
  weekEnd: '20260517',
  subjectId: 'math',
  itemId: 'item-1',
  title: '2단원 복습',
};

describe('isYmdInInclusiveRange', () => {
  it('compares ISO dates against compact YMD week ranges', () => {
    expect(isYmdInInclusiveRange('2026-05-11', '20260511', '20260517')).toBe(true);
    expect(isYmdInInclusiveRange('2026-05-10', '20260511', '20260517')).toBe(false);
    expect(isYmdInInclusiveRange('2026-05-18', '20260511', '20260517')).toBe(false);
  });
});

describe('buildWeeklyPlanTodoCreatePayload', () => {
  it('builds a one-time todo payload with weekly plan source', () => {
    const start = new Date(2026, 4, 12, 14, 0);
    const end = new Date(2026, 4, 12, 15, 0);

    expect(buildWeeklyPlanTodoCreatePayload(samplePlacement, start, end)).toEqual({
      subject: 'math',
      title: '2단원 복습',
      recurrenceType: 'once',
      date: '2026-05-12',
      startTime: '14:00',
      endTime: '15:00',
      weeklyPlanSource: {
        kind: 'exam-prep',
        roundSlot: 'sem1-r1',
        weekNumber: 2,
        subjectId: 'math',
        itemId: 'item-1',
      },
    });
  });
});
