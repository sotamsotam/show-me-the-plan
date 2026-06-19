import {
  isNeisSchoolLevel,
  isOtherSchoolLevel,
} from './school-level';

export const STUDENT_PROFILE_FIELDS = [
  'atptOfcdcScCode',
  'sdSchulCode',
  'schoolName',
  'grade',
  'className',
] as const;

export function validateStudentProfileFields(profile: Record<string, unknown>) {
  for (const field of STUDENT_PROFILE_FIELDS) {
    if (!profile[field] || typeof profile[field] !== 'string') {
      return `${field}는 필수입니다.`;
    }
  }

  return null;
}

export function validateSignupProfile(profile: Record<string, unknown>) {
  if (!profile || typeof profile !== 'object') {
    return '프로필 정보가 필요합니다.';
  }

  if (profile.schoolLevel === 'manager' || isOtherSchoolLevel(profile.schoolLevel)) {
    return null;
  }

  if (!isNeisSchoolLevel(profile.schoolLevel)) {
    return '초등학교, 중학교, 고등학교, 기타학생, 매니저만 지원합니다.';
  }

  return validateStudentProfileFields(profile);
}
