import { describe, expect, it } from 'vitest';
import {
  buildAllowedPlanSubjectIds,
  isAllowedPlanSubject,
  parseUserSubjects,
  validateAndNormalizeUserSubjects,
} from './user-subject-validation';
import { buildFallbackUserSubjects, MAX_SUBJECT_TAG_LENGTH, MAX_SUBJECT_TAGS } from './user-subject';

describe('user-subject-validation', () => {
  it('parseUserSubjects validates stored shape', () => {
    expect(
      parseUserSubjects([
        { id: 'neis-abc', label: '수학Ⅰ', category: 'math', source: 'neis' },
      ])
    ).toEqual([
      { id: 'neis-abc', label: '수학Ⅰ', category: 'math', source: 'neis' },
    ]);
    expect(parseUserSubjects(null)).toBeNull();
    expect(parseUserSubjects([{ id: 'x', label: '', source: 'custom' }])).toBeNull();
  });

  it('parseUserSubjects parses textbooks and studyMethods', () => {
    expect(
      parseUserSubjects([
        {
          id: 'math',
          label: '수학',
          category: 'math',
          source: 'neis',
          textbooks: ['쎈 수학', ' RPM ', '쎈 수학'],
          studyMethods: ['개념', '유형'],
        },
      ])
    ).toEqual([
      {
        id: 'math',
        label: '수학',
        category: 'math',
        source: 'neis',
        textbooks: ['쎈 수학', 'RPM'],
        studyMethods: ['개념', '유형'],
      },
    ]);
  });

  it('parseUserSubjects rejects invalid tag arrays', () => {
    expect(
      parseUserSubjects([
        {
          id: 'math',
          label: '수학',
          source: 'neis',
          textbooks: ['valid', 1],
        },
      ])
    ).toBeNull();

    expect(
      parseUserSubjects([
        {
          id: 'math',
          label: '수학',
          source: 'neis',
          textbooks: Array.from({ length: MAX_SUBJECT_TAGS + 1 }, (_, index) => `book${index}`),
        },
      ])
    ).toBeNull();
  });

  it('buildAllowedPlanSubjectIds always includes legacy subjects', () => {
    const ids = buildAllowedPlanSubjectIds([
      { id: 'neis-abc', label: '수학Ⅰ', source: 'neis' },
    ]);

    expect(isAllowedPlanSubject('math', ids)).toBe(true);
    expect(isAllowedPlanSubject('neis-abc', ids)).toBe(true);
    expect(isAllowedPlanSubject('unknown-id', ids)).toBe(false);
  });

  it('validateAndNormalizeUserSubjects rejects empty and duplicate labels', () => {
    expect(validateAndNormalizeUserSubjects([])).toEqual({
      error: '과목을 1개 이상 유지해야 합니다.',
    });

    expect(
      validateAndNormalizeUserSubjects([
        { id: 'custom-a', label: '논술', source: 'custom' },
        { id: 'custom-b', label: '논술', source: 'custom' },
      ])
    ).toEqual({ error: '중복된 과목명이 있습니다.' });
  });

  it('validateAndNormalizeUserSubjects generates id for new custom subjects', () => {
    const result = validateAndNormalizeUserSubjects([
      { label: '논술', source: 'custom' },
    ]);

    expect('error' in result).toBe(false);
    if ('error' in result) {
      return;
    }

    expect(result.subjects[0].id).toMatch(/^custom-/);
    expect(result.subjects[0].label).toBe('논술');
  });

  it('validateAndNormalizeUserSubjects preserves neis ids and allows reorder', () => {
    const result = validateAndNormalizeUserSubjects([
      { id: 'neis-abc', label: '영어', category: 'english', source: 'neis' },
      { id: 'neis-def', label: '수학Ⅰ', category: 'math', source: 'neis' },
      { label: '논술', source: 'custom' },
    ]);

    expect('error' in result).toBe(false);
    if ('error' in result) {
      return;
    }

    expect(result.subjects.map((subject) => subject.id)).toEqual([
      'neis-abc',
      'neis-def',
      expect.stringMatching(/^custom-/),
    ]);
    expect(result.subjects[2].label).toBe('논술');
  });

  it('validateAndNormalizeUserSubjects normalizes textbooks and studyMethods', () => {
    const result = validateAndNormalizeUserSubjects([
      {
        id: 'math',
        label: '수학',
        category: 'math',
        source: 'neis',
        textbooks: [' 쎈 수학 ', '쎈 수학', 'RPM'],
        studyMethods: ['개념', '  유형  '],
      },
    ]);

    expect('error' in result).toBe(false);
    if ('error' in result) {
      return;
    }

    expect(result.subjects[0]).toEqual({
      id: 'math',
      label: '수학',
      category: 'math',
      source: 'neis',
      textbooks: ['쎈 수학', 'RPM'],
      studyMethods: ['개념', '유형'],
    });
  });

  it('validateAndNormalizeUserSubjects omits empty tag arrays', () => {
    const result = validateAndNormalizeUserSubjects([
      {
        id: 'math',
        label: '수학',
        category: 'math',
        source: 'neis',
        textbooks: [],
        studyMethods: ['  '],
      },
    ]);

    expect('error' in result).toBe(false);
    if ('error' in result) {
      return;
    }

    expect(result.subjects[0]).toEqual({
      id: 'math',
      label: '수학',
      category: 'math',
      source: 'neis',
    });
  });

  it('validateAndNormalizeUserSubjects rejects invalid tag values', () => {
    expect(
      validateAndNormalizeUserSubjects([
        {
          id: 'math',
          label: '수학',
          source: 'neis',
          textbooks: ['a'.repeat(MAX_SUBJECT_TAG_LENGTH + 1)],
        },
      ])
    ).toEqual({
      error: `subjects[0].textbooks 항목은 ${MAX_SUBJECT_TAG_LENGTH}자 이하여야 합니다.`,
    });

    expect(
      validateAndNormalizeUserSubjects([
        {
          id: 'math',
          label: '수학',
          source: 'neis',
          studyMethods: Array.from({ length: MAX_SUBJECT_TAGS + 1 }, (_, index) => `m${index}`),
        },
      ])
    ).toEqual({
      error: `subjects[0].studyMethods은(는) 최대 ${MAX_SUBJECT_TAGS}개까지 등록할 수 있습니다.`,
    });

    expect(
      validateAndNormalizeUserSubjects([
        {
          id: 'math',
          label: '수학',
          source: 'neis',
          textbooks: { name: '쎈' },
        },
      ])
    ).toEqual({
      error: 'subjects[0].textbooks은(는) 문자열 배열이어야 합니다.',
    });
  });

  it('buildAllowedPlanSubjectIds with no profile subjects still allows legacy', () => {
    const ids = buildAllowedPlanSubjectIds(null);
    expect(ids.size).toBe(buildFallbackUserSubjects().length);
  });

  it('validateStudyPlanTodoInput accepts profile subject ids and legacy values', async () => {
    const { validateStudyPlanTodoInput } = await import('./study-plan-todo');

    const profileSubjects = [
      { id: 'neis-abc', label: '수학Ⅰ', category: 'math' as const, source: 'neis' as const },
    ];

    const baseInput = {
      title: '복습',
      startTime: '16:00',
      endTime: '18:00',
      recurrenceType: 'once' as const,
      date: '2026-03-01',
    };

    expect(
      validateStudyPlanTodoInput({ ...baseInput, subject: 'neis-abc' }, { profileSubjects })
    ).toBeNull();

    expect(
      validateStudyPlanTodoInput({ ...baseInput, subject: 'math' }, { profileSubjects })
    ).toBeNull();

    expect(
      validateStudyPlanTodoInput({ ...baseInput, subject: 'unknown-subject' }, {
        profileSubjects,
      })
    ).toBe('subject는 유효한 과목 값이어야 합니다.');
  });
});
