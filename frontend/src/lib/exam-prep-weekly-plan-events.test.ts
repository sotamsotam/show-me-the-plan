import { describe, expect, it } from 'vitest';

import { createDefaultExamPrepWeeksByRound } from './exam-countdown';
import {
  buildExamPrepWeeklyPlanEvents,
  EXAM_PREP_MEMO_EVENT_TYPE,
} from './exam-prep-weekly-plan-events';

describe('buildExamPrepWeeklyPlanEvents', () => {
  const examPrepWeeksByRound = createDefaultExamPrepWeeksByRound(4);
  const subjects = [
    { id: 'korean', label: '국어', source: 'custom' as const },
    { id: 'english', label: '영어', source: 'custom' as const },
  ];

  it('creates read-only all-day events for saved weekly plans', () => {
    const events = buildExamPrepWeeklyPlanEvents({
      plans: {
        'sem1-r2': {
          weeks: {
            '4': {
              korean: [{ id: 'k4', title: '교과서 1-3단원 1회독' }],
            },
            '1': {
              english: [{ id: 'e1', title: '단어 암기' }],
            },
          },
        },
      },
      examPrepWeeksByRound,
      examRoundPreview: [
        {
          slot: 'sem1-r2',
          label: '1학기 2회고사',
          firstDay: '20260610',
          lastDay: '20260610',
          hasSchedule: true,
        },
      ],
      subjects,
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      id: 'exam-prep-memo-sem1-r2-4-korean-k4',
      title: '[국어] 교과서 1-3단원 1회독',
      start: '2026-05-11',
      end: '2026-05-18',
      allDay: true,
      editable: false,
      extendedProps: {
        type: EXAM_PREP_MEMO_EVENT_TYPE,
        roundSlot: 'sem1-r2',
        weekNumber: 4,
        subjectId: 'korean',
        itemId: 'k4',
        weekStart: '20260511',
        weekEnd: '20260517',
      },
    });
    expect(events[1]).toMatchObject({
      id: 'exam-prep-memo-sem1-r2-1-english-e1',
      start: '2026-06-01',
      end: '2026-06-10',
    });
  });

  it('skips rounds without schedule and empty content', () => {
    const events = buildExamPrepWeeklyPlanEvents({
      plans: {
        'sem1-r1': {
          weeks: {
            '2': { korean: [{ id: 'empty', title: '   ' }] },
          },
        },
        'sem2-r1': {
          weeks: {
            '1': { korean: [{ id: 'k1', title: '기출 정리' }] },
          },
        },
      },
      examPrepWeeksByRound,
      examRoundPreview: [
        {
          slot: 'sem1-r1',
          label: null,
          firstDay: null,
          lastDay: null,
          hasSchedule: false,
        },
        {
          slot: 'sem2-r1',
          label: '2학기 1회고사',
          firstDay: '20261020',
          lastDay: '20261020',
          hasSchedule: true,
        },
      ],
      subjects,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.extendedProps?.roundSlot).toBe('sem2-r1');
  });
});
