import { describe, expect, it } from 'vitest';

import {
  getSubjectChartColor,
  SUBJECT_CHART_COLORS,
} from './study-stats-colors';
import {
  buildSubjectSelectOptions,
  getSubjectLabel,
  getSubjectOptions,
  hashSubjectColor,
  isCustomSubjectWithoutCategory,
  resolveProfileSubjects,
  resolveSubjectCategory,
} from './user-subject';
import { formatStudyPlanEventTitle } from './study-plan-todo';

describe('user-subject utilities', () => {
  const profileSubjects = [
    { id: 'neis-math1', label: '수학Ⅰ', category: 'math' as const, source: 'neis' as const },
    { id: 'custom-essay', label: '논술', source: 'custom' as const },
  ];

  it('resolveProfileSubjects falls back to legacy 11 subjects', () => {
    expect(resolveProfileSubjects(null)).toHaveLength(11);
    expect(resolveProfileSubjects([])).toHaveLength(11);
    expect(resolveProfileSubjects(profileSubjects)).toEqual(profileSubjects);
  });

  it('getSubjectOptions maps profile subjects to select options', () => {
    expect(getSubjectOptions(profileSubjects)).toEqual([
      { value: 'neis-math1', label: '수학Ⅰ', category: 'math' },
      { value: 'custom-essay', label: '논술', category: undefined },
    ]);
  });

  it('getSubjectLabel resolves legacy and profile labels', () => {
    expect(getSubjectLabel('math')).toBe('수학');
    expect(getSubjectLabel('neis-math1', profileSubjects)).toBe('수학Ⅰ');
    expect(getSubjectLabel('custom-essay', profileSubjects)).toBe('논술');
    expect(getSubjectLabel('deleted-id', profileSubjects)).toBe('기타');
  });

  it('resolveSubjectCategory uses profile category when available', () => {
    expect(resolveSubjectCategory('neis-math1', profileSubjects)).toBe('math');
    expect(resolveSubjectCategory('custom-essay', profileSubjects)).toBe('other');
    expect(resolveSubjectCategory('unknown', profileSubjects)).toBe('other');
  });

  it('isCustomSubjectWithoutCategory detects uncategorized custom subjects', () => {
    expect(isCustomSubjectWithoutCategory('custom-essay', profileSubjects)).toBe(true);
    expect(isCustomSubjectWithoutCategory('neis-math1', profileSubjects)).toBe(false);
    expect(isCustomSubjectWithoutCategory('math', profileSubjects)).toBe(false);
  });

  it('hashSubjectColor returns stable hsl values', () => {
    expect(hashSubjectColor('custom-essay')).toBe(hashSubjectColor('custom-essay'));
    expect(hashSubjectColor('custom-essay')).toMatch(/^hsl\(\d+, 52%, 42%\)$/);
  });

  it('buildSubjectSelectOptions appends orphan current subject as (기존)', () => {
    const options = getSubjectOptions(profileSubjects);
    const withOrphan = buildSubjectSelectOptions(options, 'deleted-id', profileSubjects);

    expect(withOrphan).toHaveLength(options.length + 1);
    expect(withOrphan.at(-1)).toEqual({
      value: 'deleted-id',
      label: '기타 (기존)',
    });
  });

  it('formatStudyPlanEventTitle uses profile labels and legacy fallback', () => {
    expect(formatStudyPlanEventTitle('math', '복습')).toBe('[수학] 복습');
    expect(formatStudyPlanEventTitle('neis-math1', '문제풀이', profileSubjects)).toBe(
      '[수학Ⅰ] 문제풀이'
    );
    expect(formatStudyPlanEventTitle('deleted-id', '남은 플랜', profileSubjects)).toBe(
      '[기타] 남은 플랜'
    );
  });
});

describe('study-stats-colors', () => {
  const profileSubjects = [
    { id: 'neis-math1', label: '수학Ⅰ', category: 'math' as const, source: 'neis' as const },
    { id: 'custom-essay', label: '논술', source: 'custom' as const },
  ];

  it('getSubjectChartColor uses category colors or hash fallback', () => {
    expect(getSubjectChartColor('math')).toBe(SUBJECT_CHART_COLORS.math);
    expect(getSubjectChartColor('neis-math1', profileSubjects)).toBe(SUBJECT_CHART_COLORS.math);
    expect(getSubjectChartColor('custom-essay', profileSubjects)).toMatch(/^hsl\(/);
  });
});
