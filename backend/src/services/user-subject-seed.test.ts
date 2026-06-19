import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildSubjectsFromTimetableEntries,
  buildSubjectsFromTimetableLabels,
  createNeisSubjectId,
  extractUniqueTimetableSubjectLabels,
  hasSchoolProfileIdentityChanged,
  isExtracurricularSubject,
  resolveFallbackSubjectsForOtherStudent,
  resolveSeedSubjectsForProfile,
} from './user-subject-seed';
import { buildFallbackUserSubjects } from './user-subject';

vi.mock('./neis', () => ({
  getSchoolTimetable: vi.fn(),
  isoDateRangeToYmd: vi.fn((from: string, to: string) => ({
    fromDate: from.replace(/-/g, ''),
    toDate: to.replace(/-/g, ''),
  })),
}));

import { getSchoolTimetable } from './neis';

const seedProfile = {
  schoolLevel: 'high' as const,
  atptOfcdcScCode: 'B10',
  sdSchulCode: '7010567',
  grade: '2',
  className: '3',
};

describe('user-subject-seed', () => {
  it('isExtracurricularSubject excludes non-curricular items', () => {
    expect(isExtracurricularSubject('창의적 체험활동')).toBe(true);
    expect(isExtracurricularSubject('동아리')).toBe(true);
    expect(isExtracurricularSubject('자율')).toBe(true);
    expect(isExtracurricularSubject('진로')).toBe(true);
    expect(isExtracurricularSubject('휴업')).toBe(true);
    expect(isExtracurricularSubject('수학Ⅰ')).toBe(false);
    expect(isExtracurricularSubject('통합과학')).toBe(false);
  });

  it('extractUniqueTimetableSubjectLabels dedupes and filters', () => {
    const labels = extractUniqueTimetableSubjectLabels([
      { date: '20260302', period: 1, subject: '수학Ⅰ' },
      { date: '20260303', period: 1, subject: '수학Ⅰ' },
      { date: '20260302', period: 2, subject: '동아리' },
      { date: '20260302', period: 3, subject: '영어' },
    ]);

    expect(labels).toEqual(['수학Ⅰ', '영어']);
  });

  it('buildSubjectsFromTimetableLabels maps category and source', () => {
    const subjects = buildSubjectsFromTimetableLabels(['수학Ⅰ', '영어']);
    expect(subjects).toHaveLength(2);
    expect(subjects[0]).toMatchObject({
      label: '수학Ⅰ',
      category: 'math',
      source: 'neis',
    });
    expect(subjects[1]).toMatchObject({
      label: '영어',
      category: 'english',
      source: 'neis',
    });
    expect(subjects[0].id).toMatch(/^neis-/);
  });

  it('createNeisSubjectId is stable for the same label', () => {
    expect(createNeisSubjectId('수학Ⅰ')).toBe(createNeisSubjectId('수학Ⅰ'));
    expect(createNeisSubjectId('수학Ⅰ')).not.toBe(createNeisSubjectId('영어'));
  });

  it('buildSubjectsFromTimetableEntries combines extract and build', () => {
    const subjects = buildSubjectsFromTimetableEntries([
      { date: '20260302', period: 1, subject: '  미적분  ' },
      { date: '20260302', period: 2, subject: '창의적체험활동' },
    ]);

    expect(subjects).toHaveLength(1);
    expect(subjects[0].label).toBe('미적분');
    expect(subjects[0].category).toBe('math');
  });

  it('hasSchoolProfileIdentityChanged detects school/grade/class changes only', () => {
    const before = {
      atptOfcdcScCode: 'B10',
      sdSchulCode: '7010567',
      grade: '2',
      className: '3',
    };

    expect(
      hasSchoolProfileIdentityChanged(before, {
        ...before,
        className: '4',
      })
    ).toBe(true);

    expect(
      hasSchoolProfileIdentityChanged(before, {
        ...before,
        schoolName: '다른 표시명',
      } as typeof before & { schoolName: string })
    ).toBe(false);
  });
});

describe('resolveSeedSubjectsForProfile', () => {
  beforeEach(() => {
    vi.mocked(getSchoolTimetable).mockReset();
  });

  it('returns NEIS subjects when timetable has curricular entries', async () => {
    vi.mocked(getSchoolTimetable).mockResolvedValue([
      { date: '20260302', period: 1, subject: '수학Ⅰ' },
      { date: '20260302', period: 2, subject: '동아리' },
    ]);

    const subjects = await resolveSeedSubjectsForProfile(seedProfile);

    expect(subjects).toHaveLength(1);
    expect(subjects[0]).toMatchObject({
      label: '수학Ⅰ',
      category: 'math',
      source: 'neis',
    });
  });

  it('falls back to 11 legacy subjects when NEIS returns empty', async () => {
    vi.mocked(getSchoolTimetable).mockResolvedValue([]);

    const subjects = await resolveSeedSubjectsForProfile(seedProfile);

    expect(subjects).toEqual(buildFallbackUserSubjects());
  });

  it('falls back to 11 legacy subjects when NEIS throws', async () => {
    vi.mocked(getSchoolTimetable).mockRejectedValue(new Error('NEIS unavailable'));

    const subjects = await resolveSeedSubjectsForProfile(seedProfile);

    expect(subjects).toHaveLength(11);
    expect(subjects.map((subject) => subject.id)).toEqual(
      buildFallbackUserSubjects().map((subject) => subject.id)
    );
  });
});

describe('resolveFallbackSubjectsForOtherStudent', () => {
  it('returns legacy fallback subjects without calling NEIS', () => {
    expect(resolveFallbackSubjectsForOtherStudent()).toEqual(buildFallbackUserSubjects());
  });
});
