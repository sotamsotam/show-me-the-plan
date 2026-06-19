import type { LegacyStudyPlanSubject, PlanSubjectKey, ProfileSubjectsInput } from '@/lib/user-subject';
import {
  hashSubjectColor,
  isCustomSubjectWithoutCategory,
  resolveSubjectCategory,
} from '@/lib/user-subject';

export const SUBJECT_CHART_COLORS: Record<LegacyStudyPlanSubject, string> = {
  korean: '#dc2626',
  english: '#2563eb',
  math: '#7c3aed',
  social: '#d97706',
  science: '#0891b2',
  ethics: '#db2777',
  tech_home: '#65a30d',
  info: '#0284c7',
  history: '#a16207',
  chinese: '#be123c',
  other: '#4b5563',
};

export function getSubjectChartColor(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): string {
  if (isCustomSubjectWithoutCategory(subject, subjects)) {
    return hashSubjectColor(subject);
  }

  return (
    SUBJECT_CHART_COLORS[resolveSubjectCategory(subject, subjects)] ??
    SUBJECT_CHART_COLORS.other
  );
}
