import { describe, expect, it } from 'vitest';
import type { ExpandedStudyPlanTodoEvent } from '@/lib/study-plan-todo';
import {
  buildInitialFromExpandedEvent,
  resolveEditFormMode,
  shouldShowOccurrenceChooser,
} from '@/lib/study-plan-todo-edit';

function makeEvent(
  overrides: Partial<ExpandedStudyPlanTodoEvent> = {}
): ExpandedStudyPlanTodoEvent {
  return {
    id: '1:2025-06-25',
    todoId: 1,
    subject: 'math',
    title: '수학',
    start: '2025-06-25T16:00:00',
    end: '2025-06-25T18:00:00',
    date: '2025-06-25',
    recurrenceType: 'once',
    hasOverride: false,
    ...overrides,
  };
}

describe('study-plan-todo-edit', () => {
  it('buildInitialFromExpandedEvent extracts time and date', () => {
    expect(buildInitialFromExpandedEvent(makeEvent())).toEqual({
      startTime: '16:00',
      endTime: '18:00',
      date: '2025-06-25',
    });
  });

  it('shouldShowOccurrenceChooser for weekly without override', () => {
    expect(
      shouldShowOccurrenceChooser(makeEvent({ recurrenceType: 'weekly', hasOverride: false }))
    ).toBe(true);
    expect(
      shouldShowOccurrenceChooser(makeEvent({ recurrenceType: 'weekly', hasOverride: true }))
    ).toBe(false);
    expect(
      shouldShowOccurrenceChooser(makeEvent({ recurrenceType: 'once' }))
    ).toBe(false);
  });

  it('resolveEditFormMode returns occurrence for weekly override', () => {
    expect(
      resolveEditFormMode(makeEvent({ recurrenceType: 'weekly', hasOverride: true }))
    ).toBe('occurrence');
    expect(resolveEditFormMode(makeEvent({ recurrenceType: 'once' }))).toBe('once');
    expect(
      resolveEditFormMode(makeEvent({ recurrenceType: 'weekly', hasOverride: false }))
    ).toBe('once');
  });
});
