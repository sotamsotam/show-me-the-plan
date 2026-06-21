export type NeisSchoolLevel = 'elementary' | 'middle' | 'high';
export type OtherStudentSchoolLevel = 'other';
export type SchoolLevel = NeisSchoolLevel | OtherStudentSchoolLevel | 'manager';

import type { SubscriptionSummary } from '@/types/subscription';
import type { ExamPrepWeeklyPlans } from '@/lib/exam-prep-weekly-plan';
import type { UserSubject } from '@/lib/user-subject';
export type {
  LegacyStudyPlanSubject,
  PlanSubjectKey,
  UserSubject,
  UserSubjectSource,
} from '@/lib/user-subject';

export type ManagerStatus = 'pending' | 'approved' | 'rejected';

export interface SchoolSearchResult {
  atptOfcdcScCode: string;
  atptOfcdcScNm: string;
  sdSchulCode: string;
  schulNm: string;
  lctnScNm: string;
}

export interface NeisStudentSignupProfile {
  schoolLevel: NeisSchoolLevel;
  atptOfcdcScCode: string;
  sdSchulCode: string;
  schoolName: string;
  grade: string;
  className: string;
}

/** @deprecated Use NeisStudentSignupProfile */
export type StudentSignupProfile = NeisStudentSignupProfile;

export interface OtherStudentSignupProfile {
  schoolLevel: OtherStudentSchoolLevel;
}

export interface ManagerSignupProfile {
  schoolLevel: 'manager';
}

export type SignupProfile =
  | NeisStudentSignupProfile
  | OtherStudentSignupProfile
  | ManagerSignupProfile;

export interface ManagerUser {
  id: number;
  username: string;
  email: string;
}

export interface UserProfile {
  schoolLevel: SchoolLevel;
  managerStatus?: ManagerStatus | null;
  atptOfcdcScCode?: string | null;
  sdSchulCode?: string | null;
  schoolName?: string | null;
  grade?: string | null;
  className?: string | null;
  examPrepWeeksBefore?: number | null;
  examPrepWeeksByRound?: {
    defaultWeeks: number;
    weeksBySlot: Record<string, number>;
  } | null;
  examPrepWeeklyPlans?: ExamPrepWeeklyPlans | null;
  subjects?: UserSubject[] | null;
  assignedManagers?: ManagerUser[];
  guardianConsentConfirmedAt?: string | null;
  termsAgreedAt?: string | null;
  isOperator?: boolean;
}

export interface UserRole {
  id: number;
  name: string;
  type: string;
}

export interface AccountUser {
  id: number;
  username: string;
  email: string;
}

export interface AccountInfo {
  user?: AccountUser | null;
  role: UserRole | null;
  profile: UserProfile | null;
  subscription?: SubscriptionSummary | null;
}

export const SCHOOL_LEVEL_OPTIONS: {
  value: SchoolLevel;
  label: string;
  enabled: boolean;
}[] = [
  { value: 'elementary', label: '초등학생', enabled: true },
  { value: 'middle', label: '중학생', enabled: true },
  { value: 'high', label: '고등학생', enabled: true },
  { value: 'other', label: '기타학생', enabled: true },
  { value: 'manager', label: '매니저 (학부모/선생님 계정)', enabled: true },
];

export const SCHOOL_LEVEL_LABEL: Record<string, string> = {
  elementary: '초등학생',
  middle: '중학생',
  high: '고등학생',
  other: '기타학생',
  manager: '매니저',
};

export function isNeisStudent(
  schoolLevel: string | undefined | null
): schoolLevel is NeisSchoolLevel {
  return (
    schoolLevel === 'elementary' ||
    schoolLevel === 'middle' ||
    schoolLevel === 'high'
  );
}

/** @deprecated Use isNeisStudent. NEIS 학교가 있는 초·중·고 학생만 해당합니다. */
export const isStudentSchoolLevel = isNeisStudent;

export function isOtherStudent(
  schoolLevel: string | undefined | null
): schoolLevel is OtherStudentSchoolLevel {
  return schoolLevel === 'other';
}

export function isAnyStudent(
  schoolLevel: string | undefined | null
): schoolLevel is NeisSchoolLevel | OtherStudentSchoolLevel {
  return isNeisStudent(schoolLevel) || isOtherStudent(schoolLevel);
}

export function isPendingManager(account: AccountInfo | null | undefined): boolean {
  return (
    account?.profile?.schoolLevel === 'manager' &&
    account?.profile?.managerStatus === 'pending'
  );
}

export function isApprovedManager(account: AccountInfo | null | undefined): boolean {
  if (account?.profile?.schoolLevel === 'manager') {
    return account.profile.managerStatus === 'approved';
  }

  return account?.role?.type === 'manager';
}
