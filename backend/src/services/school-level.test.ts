import { describe, expect, it } from 'vitest';
import {
  isAnyStudentSchoolLevel,
  isNeisSchoolLevel,
  isOtherSchoolLevel,
  isStudentSchoolLevel,
} from './school-level';

describe('school-level helpers', () => {
  it('identifies NEIS school levels', () => {
    expect(isNeisSchoolLevel('elementary')).toBe(true);
    expect(isNeisSchoolLevel('middle')).toBe(true);
    expect(isNeisSchoolLevel('high')).toBe(true);
    expect(isNeisSchoolLevel('other')).toBe(false);
    expect(isNeisSchoolLevel('manager')).toBe(false);
  });

  it('identifies other student level', () => {
    expect(isOtherSchoolLevel('other')).toBe(true);
    expect(isOtherSchoolLevel('high')).toBe(false);
  });

  it('identifies any student level', () => {
    expect(isAnyStudentSchoolLevel('elementary')).toBe(true);
    expect(isAnyStudentSchoolLevel('other')).toBe(true);
    expect(isAnyStudentSchoolLevel('manager')).toBe(false);
  });

  it('keeps isStudentSchoolLevel as NEIS-only alias', () => {
    expect(isStudentSchoolLevel('high')).toBe(true);
    expect(isStudentSchoolLevel('other')).toBe(false);
  });
});
