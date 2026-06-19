import {
  migrateLegacyVacationWeeklyPlanKey,
  type VacationPeriodSlot,
} from '@/lib/vacation-period-settings';
import type { VacationPeriod } from '@/lib/school-term-periods';

export const MAX_VACATION_WEEKLY_PLAN_CONTENT_LENGTH = 500;
export const MAX_VACATION_WEEKS = 16;

export type VacationWeeklyPlanWeekSubjects = Record<string, string>;

export interface VacationWeeklyPlanByPeriod {
  weeks: Partial<Record<string, VacationWeeklyPlanWeekSubjects>>;
}

export type VacationWeeklyPlans = Partial<Record<VacationPeriodSlot, VacationWeeklyPlanByPeriod>>;

export interface VacationPeriodPreviewItem {
  slot: VacationPeriodSlot;
  periodKey: VacationPeriodSlot;
  label: string;
  start: string;
  end: string;
  hasSchedule: true;
  weekCount: number;
}

export function createEmptyVacationWeeklyPlans(): VacationWeeklyPlans {
  return {};
}

function normalizeWeekContent(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return '';
  }

  if (normalized.length > MAX_VACATION_WEEKLY_PLAN_CONTENT_LENGTH) {
    return null;
  }

  return normalized;
}

function normalizeWeekSubjects(
  value: unknown
): VacationWeeklyPlanWeekSubjects | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const subjects: VacationWeeklyPlanWeekSubjects = {};

  for (const [subjectId, content] of Object.entries(value as Record<string, unknown>)) {
    if (!subjectId.trim()) {
      continue;
    }

    const normalizedContent = normalizeWeekContent(content);
    if (normalizedContent === null) {
      return null;
    }

    if (normalizedContent) {
      subjects[subjectId] = normalizedContent;
    }
  }

  return subjects;
}

function normalizeWeeksByPeriod(
  value: unknown
): Partial<Record<string, VacationWeeklyPlanWeekSubjects>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const weeks: Partial<Record<string, VacationWeeklyPlanWeekSubjects>> = {};

  for (const [weekKey, weekValue] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d+$/.test(weekKey)) {
      continue;
    }

    const weekNumber = Number(weekKey);
    if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > MAX_VACATION_WEEKS) {
      continue;
    }

    const subjects = normalizeWeekSubjects(weekValue);
    if (subjects === null) {
      return null;
    }

    if (Object.keys(subjects).length > 0) {
      weeks[String(weekNumber)] = subjects;
    }
  }

  return weeks;
}

function mergeWeekSubjects(
  left: VacationWeeklyPlanWeekSubjects,
  right: VacationWeeklyPlanWeekSubjects
): VacationWeeklyPlanWeekSubjects {
  return { ...left, ...right };
}

function mergeWeekMaps(
  left: Partial<Record<string, VacationWeeklyPlanWeekSubjects>>,
  right: Partial<Record<string, VacationWeeklyPlanWeekSubjects>>
): Partial<Record<string, VacationWeeklyPlanWeekSubjects>> {
  const merged: Partial<Record<string, VacationWeeklyPlanWeekSubjects>> = { ...left };

  for (const [weekKey, weekSubjects] of Object.entries(right)) {
    if (!weekSubjects) {
      continue;
    }

    merged[weekKey] = merged[weekKey]
      ? mergeWeekSubjects(merged[weekKey], weekSubjects)
      : weekSubjects;
  }

  return merged;
}

export function resolveVacationWeeklyPlans(value: unknown): VacationWeeklyPlans {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createEmptyVacationWeeklyPlans();
  }

  const plans: VacationWeeklyPlans = {};

  for (const [periodKey, periodValue] of Object.entries(value as Record<string, unknown>)) {
    if (!periodValue || typeof periodValue !== 'object' || Array.isArray(periodValue)) {
      continue;
    }

    const slot = migrateLegacyVacationWeeklyPlanKey(periodKey);
    if (!slot) {
      continue;
    }

    const weeksRecord = (periodValue as { weeks?: unknown }).weeks ?? periodValue;
    const weeks = normalizeWeeksByPeriod(weeksRecord);
    if (weeks === null || Object.keys(weeks).length === 0) {
      continue;
    }

    const existing = plans[slot]?.weeks ?? {};
    plans[slot] = { weeks: mergeWeekMaps(existing, weeks) };
  }

  return plans;
}

export function getVacationWeeklyPlanContent(
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot,
  weekNumber: number,
  subjectId: string
): string | null {
  const content = plans[periodKey]?.weeks?.[String(weekNumber)]?.[subjectId];
  return content?.trim() ? content : null;
}

export function previewItemToVacationPeriod(
  item: VacationPeriodPreviewItem
): VacationPeriod {
  return {
    label: item.label,
    start: item.start,
    end: item.end,
  };
}

export interface VacationWeeklyPlansContextResponse {
  vacationWeeklyPlans: VacationWeeklyPlans;
  vacationPeriodPreview: VacationPeriodPreviewItem[];
  subjects: import('@/lib/user-subject').UserSubject[];
}

export interface VacationWeeklyPlansSaveResponse {
  vacationWeeklyPlans: VacationWeeklyPlans;
}
