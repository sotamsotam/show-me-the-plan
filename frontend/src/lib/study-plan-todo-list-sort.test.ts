import { describe, expect, it } from 'vitest';

import type { ExpandedStudyPlanTodoEvent } from '@/lib/study-plan-todo';
import type { UserSubject } from '@/lib/user-subject';
import {
  getSubjectOrderIndex,
  groupConsecutiveTodosBySubject,
  sortExpandedEventsBySubjectOrder,
} from '@/lib/study-plan-todo-list-sort';

const subjects: UserSubject[] = [
  { id: 'korean', label: '국어', source: 'neis' },
  { id: 'english', label: '영어', source: 'neis' },
  { id: 'math', label: '수학', source: 'neis' },
];

function makeEvent(
  overrides: Partial<ExpandedStudyPlanTodoEvent> & Pick<ExpandedStudyPlanTodoEvent, 'id'>
): ExpandedStudyPlanTodoEvent {
  return {
    todoId: 1,
    subject: 'math',
    title: '공부',
    start: '2026-06-12T10:00:00',
    end: '2026-06-12T11:00:00',
    date: '2026-06-12',
    recurrenceType: 'once',
    hasOverride: false,
    ...overrides,
  };
}

describe('getSubjectOrderIndex', () => {
  it('returns profile subject index', () => {
    expect(getSubjectOrderIndex('english', subjects)).toBe(1);
  });

  it('returns MAX_SAFE_INTEGER for unknown subjects', () => {
    expect(getSubjectOrderIndex('unknown-subject', subjects)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('sortExpandedEventsBySubjectOrder', () => {
  it('sorts by profile subject order, then start time within the same subject', () => {
    const events = [
      makeEvent({ id: 'math-late', subject: 'math', start: '2026-06-12T14:00:00' }),
      makeEvent({ id: 'english', subject: 'english', start: '2026-06-12T09:00:00' }),
      makeEvent({ id: 'math-early', subject: 'math', start: '2026-06-12T10:00:00' }),
      makeEvent({ id: 'korean', subject: 'korean', start: '2026-06-12T16:00:00' }),
    ];

    expect(sortExpandedEventsBySubjectOrder(events, subjects).map((event) => event.id)).toEqual([
      'korean',
      'english',
      'math-early',
      'math-late',
    ]);
  });
});

describe('groupConsecutiveTodosBySubject', () => {
  it('groups adjacent todos with the same subject', () => {
    const events = [
      makeEvent({ id: 'korean-1', subject: 'korean', start: '2026-06-12T10:00:00' }),
      makeEvent({ id: 'korean-2', subject: 'korean', start: '2026-06-12T11:00:00' }),
      makeEvent({ id: 'math-1', subject: 'math', start: '2026-06-12T12:00:00' }),
      makeEvent({ id: 'english-1', subject: 'english', start: '2026-06-12T13:00:00' }),
      makeEvent({ id: 'math-2', subject: 'math', start: '2026-06-12T14:00:00' }),
    ];

    expect(groupConsecutiveTodosBySubject(events)).toEqual([
      { subject: 'korean', todos: [events[0], events[1]] },
      { subject: 'math', todos: [events[2]] },
      { subject: 'english', todos: [events[3]] },
      { subject: 'math', todos: [events[4]] },
    ]);
  });
});
