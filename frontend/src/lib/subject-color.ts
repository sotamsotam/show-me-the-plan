import type { CSSProperties } from 'react';
import type { EventInput } from '@fullcalendar/core';
import {
  CALENDAR_SUBJECT_TOKENS,
  type CalendarEventToken,
} from '@/lib/calendar-design-tokens';
import {
  findUserSubject,
  hashSubjectColor,
  isCustomSubjectWithoutCategory,
  resolveSubjectCategory,
  type LegacyStudyPlanSubject,
  type PlanSubjectKey,
  type ProfileSubjectsInput,
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

export interface SubjectColorTokens extends CalendarEventToken {
  accent: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim();
  if (!normalized.startsWith('#')) {
    return null;
  }

  const raw = normalized.slice(1);
  if (raw.length === 3) {
    return {
      r: Number.parseInt(raw[0] + raw[0], 16),
      g: Number.parseInt(raw[1] + raw[1], 16),
      b: Number.parseInt(raw[2] + raw[2], 16),
    };
  }

  if (raw.length === 6) {
    return {
      r: Number.parseInt(raw.slice(0, 2), 16),
      g: Number.parseInt(raw.slice(2, 4), 16),
      b: Number.parseInt(raw.slice(4, 6), 16),
    };
  }

  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (channel: number) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function mixHex(hexA: string, hexB: string, weightB: number): string {
  const a = parseHexColor(hexA);
  const b = parseHexColor(hexB);
  if (!a || !b) {
    return hexA;
  }

  const weight = clamp(weightB, 0, 1);
  return rgbToHex(
    a.r + (b.r - a.r) * weight,
    a.g + (b.g - a.g) * weight,
    a.b + (b.b - a.b) * weight
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHexColor(hex);
  if (!rgb) {
    return hex;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
}

export function deriveSubjectColorTokens(accent: string): SubjectColorTokens {
  return {
    accent: accent.toUpperCase(),
    bg: mixHex(accent, '#FFFFFF', 0.88),
    text: mixHex(accent, '#000000', 0.35),
    darkBg: hexToRgba(accent, 0.22),
    darkAccent: mixHex(accent, '#FFFFFF', 0.42),
    darkText: '#E8EAED',
  };
}

function getCategoryDefaultTokens(
  category: LegacyStudyPlanSubject
): SubjectColorTokens {
  return CALENDAR_SUBJECT_TOKENS[category];
}

export function getExplicitSubjectColor(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): string | undefined {
  return findUserSubject(subject, subjects)?.color;
}

export function hasExplicitSubjectColor(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): boolean {
  return Boolean(getExplicitSubjectColor(subject, subjects));
}

export function getSubjectAccentColor(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): string {
  const explicit = getExplicitSubjectColor(subject, subjects);
  if (explicit) {
    return explicit.toUpperCase();
  }

  if (isCustomSubjectWithoutCategory(subject, subjects)) {
    return hashSubjectColor(subject);
  }

  const category = resolveSubjectCategory(subject, subjects);
  return getCategoryDefaultTokens(category).accent;
}

export function getSubjectColorTokens(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): SubjectColorTokens {
  const explicit = getExplicitSubjectColor(subject, subjects);
  if (explicit) {
    return deriveSubjectColorTokens(explicit);
  }

  if (isCustomSubjectWithoutCategory(subject, subjects)) {
    return deriveSubjectColorTokens(hashSubjectColor(subject));
  }

  return getCategoryDefaultTokens(resolveSubjectCategory(subject, subjects));
}

export function getSubjectChartColor(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): string {
  const explicit = getExplicitSubjectColor(subject, subjects);
  if (explicit) {
    return explicit.toUpperCase();
  }

  if (isCustomSubjectWithoutCategory(subject, subjects)) {
    return hashSubjectColor(subject);
  }

  const category = resolveSubjectCategory(subject, subjects);
  return SUBJECT_CHART_COLORS[category] ?? SUBJECT_CHART_COLORS.other;
}

export function buildSubjectCalendarColorVars(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): Record<string, string> | undefined {
  const explicit = getExplicitSubjectColor(subject, subjects);
  if (!explicit) {
    return undefined;
  }

  const tokens = deriveSubjectColorTokens(explicit);
  return {
    '--cal-event-bg': tokens.bg,
    '--cal-event-accent': tokens.accent,
    '--cal-event-text': tokens.text,
  };
}

export function enrichCalendarEventWithSubjectColor(
  event: EventInput,
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): EventInput {
  const colorVars = buildSubjectCalendarColorVars(subject, subjects);
  if (!colorVars) {
    return event;
  }

  const classNames = Array.isArray(event.classNames)
    ? [...event.classNames]
    : event.classNames
      ? [event.classNames]
      : [];

  if (!classNames.includes('subject-custom-color')) {
    classNames.push('subject-custom-color');
  }

  return {
    ...event,
    classNames,
    extendedProps: {
      ...(event.extendedProps ?? {}),
      subjectCalendarColorVars: colorVars,
    },
  };
}

export function mountCalendarEventSubjectColor(element: HTMLElement, extendedProps: unknown): void {
  if (!extendedProps || typeof extendedProps !== 'object') {
    return;
  }

  const colorVars = (extendedProps as Record<string, unknown>).subjectCalendarColorVars;
  if (!colorVars || typeof colorVars !== 'object') {
    return;
  }

  for (const [key, value] of Object.entries(colorVars as Record<string, string>)) {
    if (typeof value === 'string') {
      element.style.setProperty(key, value);
    }
  }
}

export function buildSubjectAccentBarStyle(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): CSSProperties | undefined {
  const explicit = getExplicitSubjectColor(subject, subjects);
  if (!explicit) {
    return undefined;
  }

  return {
    backgroundColor: explicit,
  };
}

export function buildSubjectBadgeStyle(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): CSSProperties | undefined {
  const explicit = getExplicitSubjectColor(subject, subjects);
  if (!explicit) {
    return undefined;
  }

  const tokens = deriveSubjectColorTokens(explicit);
  return {
    backgroundColor: tokens.bg,
    color: tokens.text,
    borderColor: mixHex(explicit, '#FFFFFF', 0.55),
  };
}

export function buildSubjectRowStyle(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): CSSProperties | undefined {
  const explicit = getExplicitSubjectColor(subject, subjects);
  if (!explicit) {
    return undefined;
  }

  const tokens = deriveSubjectColorTokens(explicit);
  return {
    backgroundColor: tokens.bg,
    borderColor: mixHex(explicit, '#FFFFFF', 0.5),
  };
}

export function buildSubjectTimelineBarStyle(
  subject: PlanSubjectKey,
  subjects: ProfileSubjectsInput | undefined,
  layer: 'planned' | 'executed' | 'school'
): CSSProperties | undefined {
  const explicit = getExplicitSubjectColor(subject, subjects);
  if (!explicit) {
    return undefined;
  }

  const tokens = deriveSubjectColorTokens(explicit);

  if (layer === 'executed') {
    return {
      backgroundColor: explicit,
      borderLeftColor: mixHex(explicit, '#000000', 0.25),
    };
  }

  return {
    backgroundColor: hexToRgba(tokens.bg, 0.92),
    borderLeftColor: hexToRgba(explicit, 0.65),
  };
}

export function buildSubjectPanelStyle(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): CSSProperties | undefined {
  const explicit = getExplicitSubjectColor(subject, subjects);
  if (!explicit) {
    return undefined;
  }

  const tokens = deriveSubjectColorTokens(explicit);
  return {
    '--exam-prep-subject-bg': tokens.bg,
    '--exam-prep-subject-accent': tokens.accent,
    '--exam-prep-subject-label': tokens.text,
    '--exam-prep-subject-text': tokens.text,
  } as CSSProperties;
}
