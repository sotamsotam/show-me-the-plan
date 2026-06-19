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

export function isLegacyStudyPlanSubject(value: string): value is LegacyStudyPlanSubject {
  return (LEGACY_STUDY_PLAN_SUBJECTS as string[]).includes(value);
}

export function resolveSubjectCategory(subject: PlanSubjectKey): LegacyStudyPlanSubject {
  if (isLegacyStudyPlanSubject(subject)) {
    return subject;
  }
  return 'other';
}

export function buildFallbackUserSubjects(): UserSubject[] {
  return LEGACY_STUDY_PLAN_SUBJECTS.map((id) => ({
    id,
    label: LEGACY_SUBJECT_LABELS[id],
    category: id,
    source: 'neis' as const,
  }));
}
