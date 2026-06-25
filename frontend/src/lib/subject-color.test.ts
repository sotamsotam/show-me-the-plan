import { describe, expect, it } from 'vitest';
import {
  deriveSubjectColorTokens,
  getSubjectAccentColor,
  getSubjectChartColor,
  hasExplicitSubjectColor,
} from './subject-color';
import { SUBJECT_COLOR_PRESETS } from './subject-color-presets';
import type { UserSubject } from './user-subject';

const profileSubjects: UserSubject[] = [
  { id: 'math', label: '수학', category: 'math', source: 'neis' },
  { id: 'neis-math1', label: '수학Ⅰ', category: 'math', source: 'neis', color: '#B71C1C' },
  { id: 'custom-essay', label: '논술', source: 'custom' },
];

describe('subject-color-presets', () => {
  it('exposes 30 preset colors including category defaults', () => {
    expect(SUBJECT_COLOR_PRESETS).toHaveLength(30);
    expect(SUBJECT_COLOR_PRESETS).toContain('#9334E6');
    expect(SUBJECT_COLOR_PRESETS).toContain('#D93025');
  });
});

describe('subject-color resolver', () => {
  it('uses category default accent when color is unset', () => {
    expect(getSubjectAccentColor('math', profileSubjects)).toBe('#9334E6');
    expect(hasExplicitSubjectColor('math', profileSubjects)).toBe(false);
  });

  it('uses explicit subject color when set', () => {
    expect(getSubjectAccentColor('neis-math1', profileSubjects)).toBe('#B71C1C');
    expect(hasExplicitSubjectColor('neis-math1', profileSubjects)).toBe(true);
  });

  it('derives calendar/chart tokens from accent', () => {
    const tokens = deriveSubjectColorTokens('#9334E6');
    expect(tokens.accent).toBe('#9334E6');
    expect(tokens.bg).toMatch(/^#/);
    expect(tokens.text).toMatch(/^#/);
  });

  it('getSubjectChartColor respects explicit color and hash fallback', () => {
    expect(getSubjectChartColor('neis-math1', profileSubjects)).toBe('#B71C1C');
    expect(getSubjectChartColor('custom-essay', profileSubjects)).toMatch(/^hsl\(/);
    expect(getSubjectChartColor('math', profileSubjects)).toBe('#7c3aed');
  });
});
