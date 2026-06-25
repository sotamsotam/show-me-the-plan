import { describe, expect, it } from 'vitest';

import {
  buildPushNotificationContent,
  buildSendAtInTimezone,
  computeNextNotifyOccurrence,
  isExecutionAlarmSkipped,
  resolveSubjectLabel,
} from './study-plan-todo-notify';
import type { StudyPlanTodoRecord } from './study-plan-todo';

function baseWeeklyTodo(
  overrides: Partial<StudyPlanTodoRecord> = {}
): StudyPlanTodoRecord {
  return {
    id: 1,
    subject: 'math',
    title: '문제집 3장',
    startTime: '19:00',
    endTime: '20:00',
    recurrenceType: 'weekly',
    daysOfWeek: [1, 3, 5],
    validFrom: '2026-06-01',
    validUntil: '2026-06-30',
    date: null,
    excludedDates: [],
    overrides: {},
    executionRecords: {},
    ...overrides,
  };
}

describe('study-plan-todo-notify', () => {
  it('isExecutionAlarmSkipped treats completed and partial as skipped', () => {
    expect(isExecutionAlarmSkipped('completed')).toBe(true);
    expect(isExecutionAlarmSkipped('partial')).toBe(true);
    expect(isExecutionAlarmSkipped('incomplete')).toBe(false);
    expect(isExecutionAlarmSkipped(undefined)).toBe(false);
  });

  it('resolveSubjectLabel uses legacy labels and custom subjects', () => {
    expect(resolveSubjectLabel('math', [])).toBe('수학');
    expect(
      resolveSubjectLabel('custom-physics', [
        { id: 'custom-physics', label: '물리', source: 'custom' },
      ])
    ).toBe('물리');
  });

  it('buildSendAtInTimezone uses Asia/Seoul offset', () => {
    const sendAt = buildSendAtInTimezone('2026-06-25', '19:00');
    expect(sendAt.toISOString()).toBe('2026-06-25T10:00:00.000Z');
  });

  it('buildPushNotificationContent formats alarm text', () => {
    expect(buildPushNotificationContent('수학', '문제집 3장')).toEqual({
      title: '[수학] 문제집 3장',
      body: '학습할 시간입니다.',
    });
  });

  it('computeNextNotifyOccurrence returns the next future weekly occurrence', () => {
    const todo = baseWeeklyTodo();
    const now = new Date('2026-06-24T09:00:00+09:00');

    expect(computeNextNotifyOccurrence(todo, now)).toEqual({
      occurrenceDate: '2026-06-24',
      sendAt: new Date('2026-06-24T10:00:00.000Z'),
      titleSnapshot: '문제집 3장',
      subjectSnapshot: '수학',
    });
  });

  it('computeNextNotifyOccurrence skips completed occurrences', () => {
    const todo = baseWeeklyTodo({
      executionRecords: {
        '2026-06-24': {
          status: 'completed',
          executedStartTime: '18:00',
          executedEndTime: '19:00',
          inputMode: 'timer',
          achievementLevel: 8,
        },
      },
    });
    const now = new Date('2026-06-24T09:00:00+09:00');

    expect(computeNextNotifyOccurrence(todo, now)?.occurrenceDate).toBe('2026-06-26');
  });

  it('computeNextNotifyOccurrence respects excluded dates', () => {
    const todo = baseWeeklyTodo({
      excludedDates: ['2026-06-24'],
    });
    const now = new Date('2026-06-24T09:00:00+09:00');

    expect(computeNextNotifyOccurrence(todo, now)?.occurrenceDate).toBe('2026-06-26');
  });

  it('computeNextNotifyOccurrence handles once todos', () => {
    const todo = baseWeeklyTodo({
      recurrenceType: 'once',
      date: '2026-06-26',
      validFrom: null,
      validUntil: null,
      daysOfWeek: [],
    });
    const now = new Date('2026-06-25T09:00:00+09:00');

    expect(computeNextNotifyOccurrence(todo, now)?.occurrenceDate).toBe('2026-06-26');
  });

  it('computeNextNotifyOccurrence uses occurrence overrides for sendAt and title', () => {
    const todo = baseWeeklyTodo({
      overrides: {
        '2026-06-24': {
          title: '오버라이드 제목',
          startTime: '21:00',
          endTime: '22:00',
        },
      },
    });
    const now = new Date('2026-06-24T09:00:00+09:00');

    expect(computeNextNotifyOccurrence(todo, now)).toEqual({
      occurrenceDate: '2026-06-24',
      sendAt: new Date('2026-06-24T12:00:00.000Z'),
      titleSnapshot: '오버라이드 제목',
      subjectSnapshot: '수학',
    });
  });
});
