import { describe, expect, it } from 'vitest';

import {
  buildOccurrenceKey,
  computeStudySessionUntil,
  getCurrentStudyDayDate,
  isStudySessionActive,
  removeOccurrenceFromSession,
  shouldSuppressPushForOccurrence,
  shouldSuppressPushOnTodoForeground,
  STUDY_SESSION_BUFFER_MS,
  STUDY_SESSION_MAX_TTL_MS,
} from '@/lib/study-session';

describe('study-session', () => {
  it('buildOccurrenceKey formats todoId and date', () => {
    expect(buildOccurrenceKey(12, '2026-06-24')).toBe('12:2026-06-24');
  });

  it('getCurrentStudyDayDate uses 05:00 anchor', () => {
    expect(getCurrentStudyDayDate(new Date('2026-06-13T02:00:00'))).toBe('2026-06-12');
    expect(getCurrentStudyDayDate(new Date('2026-06-13T06:00:00'))).toBe('2026-06-13');
  });

  it('computeStudySessionUntil caps at max end + buffer and 90min ttl', () => {
    const nowMs = Date.parse('2026-06-24T10:00:00');
    const until = computeStudySessionUntil(
      [
        { end: '2026-06-24T11:00:00' },
        { end: '2026-06-24T12:30:00' },
      ],
      nowMs
    );

    expect(until).toBe(nowMs + STUDY_SESSION_MAX_TTL_MS);
    expect(until).toBeLessThan(
      Date.parse('2026-06-24T12:30:00') + STUDY_SESSION_BUFFER_MS
    );
  });

  it('isStudySessionActive checks until and occurrence key', () => {
    const session = {
      until: Date.now() + 60_000,
      occurrenceKeys: ['1:2026-06-24'],
    };

    expect(isStudySessionActive(session, '1:2026-06-24')).toBe(true);
    expect(isStudySessionActive(session, '2:2026-06-24')).toBe(false);
    expect(
      isStudySessionActive(
        { ...session, until: Date.now() - 1 },
        '1:2026-06-24'
      )
    ).toBe(false);
  });

  it('removeOccurrenceFromSession drops empty sessions', () => {
    const session = {
      until: Date.now() + 60_000,
      occurrenceKeys: ['1:2026-06-24'],
    };

    expect(removeOccurrenceFromSession(session, '1:2026-06-24')).toBeNull();
    expect(removeOccurrenceFromSession(session, '2:2026-06-24')).toEqual(session);
  });

  it('shouldSuppressPushOnTodoForeground suppresses only visible todo clients', () => {
    expect(
      shouldSuppressPushOnTodoForeground([
        {
          visibilityState: 'visible',
          url: 'https://example.com/dashboard/todo?date=2026-06-24',
        },
      ])
    ).toBe(true);

    expect(
      shouldSuppressPushOnTodoForeground([
        {
          visibilityState: 'visible',
          url: 'https://example.com/dashboard/settings',
        },
      ])
    ).toBe(false);

    expect(
      shouldSuppressPushOnTodoForeground([
        {
          visibilityState: 'hidden',
          url: 'https://example.com/dashboard/todo',
        },
      ])
    ).toBe(false);
  });

  it('shouldSuppressPushForOccurrence checks active study session keys', () => {
    const session = {
      until: Date.now() + 60_000,
      occurrenceKeys: ['3:2026-06-24'],
    };

    expect(shouldSuppressPushForOccurrence(session, 3, '2026-06-24')).toBe(true);
    expect(shouldSuppressPushForOccurrence(session, 4, '2026-06-24')).toBe(false);
    expect(shouldSuppressPushForOccurrence(null, 3, '2026-06-24')).toBe(false);
  });
});
