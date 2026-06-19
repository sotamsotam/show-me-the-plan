/** 레거시 스터디 플랜 과목 enum (고정 11개 fallback) */
export type LegacyStudyPlanSubject =
  | 'korean'
  | 'english'
  | 'math'
  | 'social'
  | 'science'
  | 'ethics'
  | 'tech_home'
  | 'info'
  | 'history'
  | 'chinese'
  | 'other';

export const LEGACY_STUDY_PLAN_SUBJECTS: LegacyStudyPlanSubject[] = [
  'korean',
  'english',
  'math',
  'social',
  'science',
  'ethics',
  'tech_home',
  'info',
  'history',
  'chinese',
  'other',
];

export const LEGACY_SUBJECT_LABELS: Record<LegacyStudyPlanSubject, string> = {
  korean: '국어',
  english: '영어',
  math: '수학',
  social: '사회',
  science: '과학',
  ethics: '도덕',
  tech_home: '기가',
  info: '정보',
  history: '역사',
  chinese: '한문',
  other: '기타',
};

export type UserSubjectSource = 'neis' | 'custom';

/** 과목별 스터디 플랜 제목 프리셋 — 교재명·공부방법 태그 */
export const MAX_SUBJECT_TAGS = 20;
export const MAX_SUBJECT_TAG_LENGTH = 50;

/** 사용자 프로필에 저장되는 과목 항목 */
export interface UserSubject {
  id: string;
  label: string;
  category?: LegacyStudyPlanSubject;
  source: UserSubjectSource;
  textbooks?: string[];
  studyMethods?: string[];
}

/** study-plan-todo.subject — 레거시 enum 값 또는 UserSubject.id */
export type PlanSubjectKey = string;

export type ProfileSubjectsInput = UserSubject[] | null | undefined;

export interface SubjectOption {
  value: PlanSubjectKey;
  label: string;
  category?: LegacyStudyPlanSubject;
}

export function isLegacyStudyPlanSubject(value: string): value is LegacyStudyPlanSubject {
  return (LEGACY_STUDY_PLAN_SUBJECTS as string[]).includes(value);
}

export function buildFallbackUserSubjects(): UserSubject[] {
  return LEGACY_STUDY_PLAN_SUBJECTS.map((id) => ({
    id,
    label: LEGACY_SUBJECT_LABELS[id],
    category: id,
    source: 'neis' as const,
  }));
}

export function resolveProfileSubjects(subjects?: ProfileSubjectsInput): UserSubject[] {
  if (subjects && subjects.length > 0) {
    return subjects;
  }

  return buildFallbackUserSubjects();
}

export function buildUserSubjectByIdMap(subjects: UserSubject[]): Map<string, UserSubject> {
  return new Map(subjects.map((subject) => [subject.id, subject]));
}

export function findUserSubject(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): UserSubject | undefined {
  return subjects?.find((item) => item.id === subject);
}

export function getSubjectOptions(subjects?: ProfileSubjectsInput): SubjectOption[] {
  return resolveProfileSubjects(subjects).map((subject) => ({
    value: subject.id,
    label: subject.label,
    category: subject.category,
  }));
}

export function getSubjectLabel(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): string {
  if (isLegacyStudyPlanSubject(subject)) {
    return LEGACY_SUBJECT_LABELS[subject];
  }

  const found = findUserSubject(subject, subjects);
  if (found) {
    return found.label;
  }

  return LEGACY_SUBJECT_LABELS.other;
}

export function resolveSubjectCategory(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): LegacyStudyPlanSubject {
  if (isLegacyStudyPlanSubject(subject)) {
    return subject;
  }

  const found = findUserSubject(subject, subjects);
  if (found?.category) {
    return found.category;
  }

  return 'other';
}

export function isCustomSubjectWithoutCategory(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): boolean {
  if (isLegacyStudyPlanSubject(subject)) {
    return false;
  }

  const found = findUserSubject(subject, subjects);
  if (!found) {
    return true;
  }

  return !found.category;
}

export function buildSubjectSelectOptions(
  subjectOptions: SubjectOption[],
  currentSubject?: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): SubjectOption[] {
  if (!currentSubject || subjectOptions.some((option) => option.value === currentSubject)) {
    return subjectOptions;
  }

  return [
    ...subjectOptions,
    {
      value: currentSubject,
      label: `${getSubjectLabel(currentSubject, subjects)} (기존)`,
    },
  ];
}

export function hashSubjectColor(subject: PlanSubjectKey): string {
  let hash = 2166136261;

  for (let index = 0; index < subject.length; index++) {
    hash ^= subject.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const hue = (hash >>> 0) % 360;
  return `hsl(${hue}, 52%, 42%)`;
}
