import type { StudyPlanSubject } from '@/lib/study-plan-todo';
import type { PlanSubjectKey, ProfileSubjectsInput } from '@/lib/user-subject';
import { resolveSubjectCategory } from '@/lib/user-subject';

export interface CalendarEventToken {
  bg: string;
  accent: string;
  text: string;
  darkBg: string;
  darkAccent: string;
  darkText: string;
}

export const CALENDAR_SUBJECT_TOKENS: Record<StudyPlanSubject, CalendarEventToken> = {
  korean: {
    bg: '#FCE8E6',
    accent: '#D93025',
    text: '#C5221F',
    darkBg: 'rgba(217, 48, 37, 0.2)',
    darkAccent: '#F28B82',
    darkText: '#E8EAED',
  },
  english: {
    bg: '#E8F0FE',
    accent: '#1A73E8',
    text: '#174EA6',
    darkBg: 'rgba(26, 115, 232, 0.2)',
    darkAccent: '#8AB4F8',
    darkText: '#E8EAED',
  },
  math: {
    bg: '#F3E8FD',
    accent: '#9334E6',
    text: '#7627BB',
    darkBg: 'rgba(147, 52, 230, 0.2)',
    darkAccent: '#C58AF9',
    darkText: '#E8EAED',
  },
  social: {
    bg: '#FEF7E0',
    accent: '#F9AB00',
    text: '#B06000',
    darkBg: 'rgba(249, 171, 0, 0.18)',
    darkAccent: '#FDD663',
    darkText: '#E8EAED',
  },
  science: {
    bg: '#E6F4EA',
    accent: '#34A853',
    text: '#137333',
    darkBg: 'rgba(52, 168, 83, 0.2)',
    darkAccent: '#81C995',
    darkText: '#E8EAED',
  },
  ethics: {
    bg: '#FCE4EC',
    accent: '#E91E8C',
    text: '#AD1457',
    darkBg: 'rgba(233, 30, 140, 0.18)',
    darkAccent: '#F48FB1',
    darkText: '#E8EAED',
  },
  tech_home: {
    bg: '#E0F7FA',
    accent: '#00838F',
    text: '#006064',
    darkBg: 'rgba(0, 131, 143, 0.2)',
    darkAccent: '#4DD0E1',
    darkText: '#E8EAED',
  },
  info: {
    bg: '#E3F2FD',
    accent: '#1976D2',
    text: '#0D47A1',
    darkBg: 'rgba(25, 118, 210, 0.2)',
    darkAccent: '#64B5F6',
    darkText: '#E8EAED',
  },
  history: {
    bg: '#FFF0E5',
    accent: '#E8710A',
    text: '#B06000',
    darkBg: 'rgba(232, 113, 10, 0.18)',
    darkAccent: '#FFBC6A',
    darkText: '#E8EAED',
  },
  chinese: {
    bg: '#FFF3E0',
    accent: '#EF6C00',
    text: '#E65100',
    darkBg: 'rgba(239, 108, 0, 0.18)',
    darkAccent: '#FFB74D',
    darkText: '#E8EAED',
  },
  other: {
    bg: '#F1F3F4',
    accent: '#5F6368',
    text: '#3C4043',
    darkBg: 'rgba(95, 99, 104, 0.22)',
    darkAccent: '#9AA0A6',
    darkText: '#E8EAED',
  },
};

export const CALENDAR_USER_EVENT_TOKEN: CalendarEventToken = {
  bg: '#FFF3E0',
  accent: '#E8710A',
  text: '#B06000',
  darkBg: 'rgba(232, 113, 10, 0.18)',
  darkAccent: '#FFBC6A',
  darkText: '#E8EAED',
};

export const CALENDAR_USER_FIXED_EVENT_TOKEN: CalendarEventToken = {
  bg: '#F1F3F4',
  accent: '#5F6368',
  text: '#3C4043',
  darkBg: 'rgba(95, 99, 104, 0.22)',
  darkAccent: '#9AA0A6',
  darkText: '#E8EAED',
};

export const CALENDAR_DRAFT_EVENT_TOKEN: CalendarEventToken = {
  bg: 'rgba(52, 168, 83, 0.12)',
  accent: '#34A853',
  text: '#137333',
  darkBg: 'rgba(52, 168, 83, 0.15)',
  darkAccent: '#81C995',
  darkText: '#E8EAED',
};

export function subjectClassName(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): string {
  return `subject-${resolveSubjectCategory(subject, subjects)}`;
}

export function subjectAccentColor(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): string {
  const category = resolveSubjectCategory(subject, subjects);
  return CALENDAR_SUBJECT_TOKENS[category].accent;
}
