import { describe, expect, it } from 'vitest';
import {
  buildFallbackUserSubjects,
  isLegacyStudyPlanSubject,
  LEGACY_STUDY_PLAN_SUBJECTS,
  resolveSubjectCategory,
} from './user-subject';

describe('user-subject', () => {
  it('isLegacyStudyPlanSubject recognizes legacy enum values', () => {
    expect(isLegacyStudyPlanSubject('math')).toBe(true);
    expect(isLegacyStudyPlanSubject('수학Ⅰ')).toBe(false);
  });

  it('resolveSubjectCategory maps unknown ids to other', () => {
    expect(resolveSubjectCategory('math')).toBe('math');
    expect(resolveSubjectCategory('custom-subject-id')).toBe('other');
  });

  it('buildFallbackUserSubjects returns 11 legacy subjects', () => {
    const subjects = buildFallbackUserSubjects();
    expect(subjects).toHaveLength(LEGACY_STUDY_PLAN_SUBJECTS.length);
    expect(subjects[0]).toMatchObject({
      id: 'korean',
      label: '국어',
      category: 'korean',
      source: 'neis',
    });
  });
});
