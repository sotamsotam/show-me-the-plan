import { describe, expect, it } from 'vitest';

import { createDefaultExamPrepWeeksByRound } from './exam-countdown';
import {
  createEmptyExamPrepWeeklyPlansContext,
  resolveExamPrepWeeklyPlansContext,
} from './exam-prep-weekly-plans-context';

describe('resolveExamPrepWeeklyPlansContext', () => {
  it('normalizes API response into panel-ready context', () => {
    const context = resolveExamPrepWeeklyPlansContext({
      examPrepWeeksBefore: 4,
      examPrepWeeksByRound: createDefaultExamPrepWeeksByRound(4),
      examPrepWeeklyPlans: {
        'sem1-r2': {
          weeks: {
            '4': { korean: '  1회독  ' },
          },
        },
      },
      subjects: [{ id: 'korean', label: '국어' }],
      examRoundPreview: [
        {
          slot: 'sem1-r2',
          label: '1학기 2차',
          firstDay: '20260420',
          lastDay: '20260424',
          hasSchedule: true,
        },
      ],
    });

    expect(context.plans).toEqual({
      'sem1-r2': {
        weeks: {
          '4': { korean: '1회독' },
        },
      },
    });
    expect(context.subjects).toEqual([{ id: 'korean', label: '국어' }]);
    expect(context.examRoundPreview).toHaveLength(4);
    expect(context.examRoundPreview.find((item) => item.slot === 'sem1-r2')).toEqual({
      slot: 'sem1-r2',
      label: '1학기 2차',
      firstDay: '20260420',
      lastDay: '20260424',
      hasSchedule: true,
    });
    expect(context.examRoundPreview.find((item) => item.slot === 'sem1-r1')?.hasSchedule).toBe(
      false
    );
    expect(context.examPrepWeeksByRound.weeksBySlot['sem1-r2']).toBe(4);
  });
});

describe('createEmptyExamPrepWeeklyPlansContext', () => {
  it('returns empty plans and default round settings', () => {
    const context = createEmptyExamPrepWeeklyPlansContext();

    expect(context.plans).toEqual({});
    expect(context.subjects).toEqual([]);
    expect(context.examRoundPreview).toEqual([]);
    expect(context.examPrepWeeksByRound.weeksBySlot['sem1-r1']).toBeGreaterThan(0);
  });
});
