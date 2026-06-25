import { describe, expect, it } from 'vitest';
import { createNeisSubjectId } from '@/lib/neis-subject-id';
import { resolveNeisTimetableSubject } from '@/lib/neis-timetable-subject';
import { entriesToCalendarEvents } from '@/lib/timetable';
import type { UserSubject } from '@/lib/user-subject';

describe('createNeisSubjectId', () => {
  it('matches backend hash for the same label', () => {
    expect(createNeisSubjectId('수학Ⅰ')).toBe(createNeisSubjectId('수학Ⅰ'));
    expect(createNeisSubjectId('수학Ⅰ')).not.toBe(createNeisSubjectId('영어'));
  });
});

describe('resolveNeisTimetableSubject', () => {
  const physicsId = createNeisSubjectId('물리');

  const profileSubjects: UserSubject[] = [
    {
      id: physicsId,
      label: '생물',
      category: 'science',
      source: 'neis',
    },
  ];

  it('uses profile label when NEIS subject is renamed', () => {
    expect(resolveNeisTimetableSubject('물리', profileSubjects)).toEqual({
      neisLabel: '물리',
      displayLabel: '생물',
      styleSubjectKey: physicsId,
      category: 'science',
    });
  });

  it('falls back to NEIS label when profile has no matching subject', () => {
    expect(resolveNeisTimetableSubject('화학', profileSubjects)).toEqual({
      neisLabel: '화학',
      displayLabel: '화학',
      styleSubjectKey: 'science',
      category: 'science',
    });
  });
});

describe('entriesToCalendarEvents', () => {
  it('maps school event titles through profile subjects', () => {
    const physicsId = createNeisSubjectId('물리');
    const events = entriesToCalendarEvents(
      [{ date: '20250602', period: 1, subject: '물리' }],
      'high',
      [
        {
          id: physicsId,
          label: '생물',
          category: 'science',
          source: 'neis',
        },
      ]
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe('생물');
    expect(events[0]?.extendedProps?.neisSubject).toBe('물리');
  });
});
