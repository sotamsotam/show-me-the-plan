export const NEIS_SCHOOL_LEVELS = ['elementary', 'middle', 'high'] as const;
export const OTHER_STUDENT_SCHOOL_LEVEL = 'other' as const;
export const ANY_STUDENT_SCHOOL_LEVELS = [
  ...NEIS_SCHOOL_LEVELS,
  OTHER_STUDENT_SCHOOL_LEVEL,
] as const;

export type NeisSchoolLevel = (typeof NEIS_SCHOOL_LEVELS)[number];
export type OtherStudentSchoolLevel = typeof OTHER_STUDENT_SCHOOL_LEVEL;
export type AnyStudentSchoolLevel = (typeof ANY_STUDENT_SCHOOL_LEVELS)[number];

export function isNeisSchoolLevel(value: unknown): value is NeisSchoolLevel {
  return (
    value === 'elementary' || value === 'middle' || value === 'high'
  );
}

/** @deprecated Use isNeisSchoolLevel. NEIS 학교가 있는 초·중·고 학생만 해당합니다. */
export const isStudentSchoolLevel = isNeisSchoolLevel;

export function isOtherSchoolLevel(
  value: unknown
): value is OtherStudentSchoolLevel {
  return value === OTHER_STUDENT_SCHOOL_LEVEL;
}

export function isAnyStudentSchoolLevel(
  value: unknown
): value is AnyStudentSchoolLevel {
  return isNeisSchoolLevel(value) || isOtherSchoolLevel(value);
}
