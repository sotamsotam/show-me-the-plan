import { SCHOOL_LEVEL_LABEL, type SchoolLevel } from '@/types/school';

export interface ManagedStudent {
  userId: number;
  username: string;
  email: string;
  schoolLevel: SchoolLevel;
  schoolName: string | null;
  grade: string | null;
  className: string | null;
}

export const MANAGER_SELECTED_STUDENT_KEY = 'managerSelectedStudentId';

export const MANAGER_STUDENT_REQUIRED_PATHS = [
  '/dashboard/schedule',
  '/dashboard/study-plan',
  '/dashboard/study-execution-detail',
  '/dashboard/todo',
  '/dashboard/study-stats',
  '/dashboard/preferences',
] as const;

export const MANAGER_STUDENT_NAV_ITEMS = [
  { href: '/dashboard/schedule', label: '스케줄', exact: false },
  { href: '/dashboard/study-plan', label: '스터디 플랜', exact: false },
  { href: '/dashboard/study-execution-detail', label: '공부현황', exact: false },
  { href: '/dashboard/todo', label: 'TODO', exact: false },
  { href: '/dashboard/study-stats', label: '공부통계', exact: false },
  { href: '/dashboard/preferences', label: '설정', exact: false },
] as const;

export function formatManagedStudentLabel(student: ManagedStudent): string {
  if (student.schoolName && student.grade && student.className) {
    return `${student.schoolName} ${student.grade}학년 ${student.className}반 ${student.username}`;
  }

  const levelLabel = SCHOOL_LEVEL_LABEL[student.schoolLevel] ?? student.schoolLevel;
  return `${levelLabel} ${student.username}`;
}

export function withStudentUserId(url: string, studentUserId: number | null): string {
  if (!studentUserId) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}studentUserId=${studentUserId}`;
}

export function appendStudentUserId(
  params: URLSearchParams,
  studentUserId: number | null
): URLSearchParams {
  if (studentUserId) {
    params.set('studentUserId', String(studentUserId));
  }

  return params;
}

export function isManagerStudentRequiredPath(pathname: string): boolean {
  return MANAGER_STUDENT_REQUIRED_PATHS.some((path) => pathname.startsWith(path));
}
