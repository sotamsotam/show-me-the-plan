import { describe, expect, it } from 'vitest';
import {
  isAnyStudent,
  isNeisStudent,
  isOtherStudent,
  SCHOOL_LEVEL_LABEL,
  SCHOOL_LEVEL_OPTIONS,
} from './school';

describe('school level helpers', () => {
  it('identifies NEIS students', () => {
    expect(isNeisStudent('elementary')).toBe(true);
    expect(isNeisStudent('middle')).toBe(true);
    expect(isNeisStudent('high')).toBe(true);
    expect(isNeisStudent('other')).toBe(false);
    expect(isNeisStudent('manager')).toBe(false);
  });

  it('identifies other students', () => {
    expect(isOtherStudent('other')).toBe(true);
    expect(isOtherStudent('high')).toBe(false);
  });

  it('identifies any student including other', () => {
    expect(isAnyStudent('high')).toBe(true);
    expect(isAnyStudent('other')).toBe(true);
    expect(isAnyStudent('manager')).toBe(false);
  });

  it('exposes other student in signup options and labels', () => {
    expect(SCHOOL_LEVEL_OPTIONS.some((option) => option.value === 'other')).toBe(true);
    expect(SCHOOL_LEVEL_LABEL.other).toBe('기타학생');
  });
});
