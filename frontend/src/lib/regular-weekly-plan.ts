import {
  previewItemToRegularPeriod,
  type RegularPeriodSegmentPreviewItem,
} from '@/lib/regular-period-segments';
import {
  listVacationWeekNumbers,
  resolveVacationWeekDateRange,
} from '@/lib/vacation-week-date-range';
import type { VacationPeriod } from '@/lib/school-term-periods';

export const MAX_REGULAR_WEEKLY_PLAN_CONTENT_LENGTH = 500;
export const MAX_REGULAR_WEEKS = 24;

export type RegularWeeklyPlanWeekSubjects = Record<string, string>;

export interface RegularWeeklyPlanByPeriod {
  weeks: Partial<Record<string, RegularWeeklyPlanWeekSubjects>>;
}

export type RegularWeeklyPlans = Partial<Record<string, RegularWeeklyPlanByPeriod>>;

export function createEmptyRegularWeeklyPlans(): RegularWeeklyPlans {
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

  if (normalized.length > MAX_REGULAR_WEEKLY_PLAN_CONTENT_LENGTH) {
    return null;
  }

  return normalized;
}

function normalizeWeekSubjects(value: unknown): RegularWeeklyPlanWeekSubjects | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const subjects: RegularWeeklyPlanWeekSubjects = {};

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
): Partial<Record<string, RegularWeeklyPlanWeekSubjects>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const weeks: Partial<Record<string, RegularWeeklyPlanWeekSubjects>> = {};

  for (const [weekKey, weekValue] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d+$/.test(weekKey)) {
      continue;
    }

    const weekNumber = Number(weekKey);
    if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > MAX_REGULAR_WEEKS) {
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
  left: RegularWeeklyPlanWeekSubjects,
  right: RegularWeeklyPlanWeekSubjects
): RegularWeeklyPlanWeekSubjects {
  return { ...left, ...right };
}

function mergeWeekMaps(
  left: Partial<Record<string, RegularWeeklyPlanWeekSubjects>>,
  right: Partial<Record<string, RegularWeeklyPlanWeekSubjects>>
): Partial<Record<string, RegularWeeklyPlanWeekSubjects>> {
  const merged: Partial<Record<string, RegularWeeklyPlanWeekSubjects>> = { ...left };

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

function isValidPeriodKey(value: string): boolean {
  return /^[a-z0-9-]+$/.test(value) && value.length > 0 && value.length <= 80;
}

export function resolveRegularWeeklyPlans(value: unknown): RegularWeeklyPlans {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createEmptyRegularWeeklyPlans();
  }

  const plans: RegularWeeklyPlans = {};

  for (const [periodKey, periodValue] of Object.entries(value as Record<string, unknown>)) {
    if (!isValidPeriodKey(periodKey)) {
      continue;
    }

    if (!periodValue || typeof periodValue !== 'object' || Array.isArray(periodValue)) {
      continue;
    }

    const weeksRecord = (periodValue as { weeks?: unknown }).weeks ?? periodValue;
    const weeks = normalizeWeeksByPeriod(weeksRecord);
    if (weeks === null || Object.keys(weeks).length === 0) {
      continue;
    }

    const existing = plans[periodKey]?.weeks ?? {};
    plans[periodKey] = { weeks: mergeWeekMaps(existing, weeks) };
  }

  return plans;
}

export function getRegularWeeklyPlanContent(
  plans: RegularWeeklyPlans,
  periodKey: string,
  weekNumber: number,
  subjectId: string
): string | null {
  const content = plans[periodKey]?.weeks?.[String(weekNumber)]?.[subjectId];
  return content?.trim() ? content : null;
}

export function previewItemToRegularPeriodFromPreview(
  item: RegularPeriodSegmentPreviewItem
): VacationPeriod {
  return previewItemToRegularPeriod(item);
}

export function validateRegularWeeklyPlansInput(
  value: unknown,
  options: {
    allowedSubjectIds: ReadonlySet<string>;
    regularPeriodPreview: RegularPeriodSegmentPreviewItem[];
  }
): { plans: RegularWeeklyPlans } | { error: string } {
  if (value === null || value === undefined) {
    return { plans: createEmptyRegularWeeklyPlans() };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'regularWeeklyPlans 형식이 올바르지 않습니다.' };
  }

  const periodMap = new Map(
    options.regularPeriodPreview.map((item) => [
      item.periodKey,
      previewItemToRegularPeriod(item),
    ])
  );
  const plans: RegularWeeklyPlans = {};

  for (const [periodKey, periodValue] of Object.entries(value as Record<string, unknown>)) {
    if (!isValidPeriodKey(periodKey)) {
      return { error: `지원하지 않는 평소 기간입니다: ${periodKey}` };
    }

    const period = periodMap.get(periodKey);
    if (!period) {
      return { error: `등록되지 않은 평소 기간입니다: ${periodKey}` };
    }

    if (!periodValue || typeof periodValue !== 'object' || Array.isArray(periodValue)) {
      return { error: `${periodKey} 평소 기간 데이터 형식이 올바르지 않습니다.` };
    }

    const weeksRecord = (periodValue as { weeks?: unknown }).weeks ?? periodValue;
    if (!weeksRecord || typeof weeksRecord !== 'object' || Array.isArray(weeksRecord)) {
      return { error: `${periodKey} 평소 기간 주차 데이터 형식이 올바르지 않습니다.` };
    }

    const maxWeeks = listVacationWeekNumbers(period).length;
    const weeks: Partial<Record<string, RegularWeeklyPlanWeekSubjects>> = {};

    for (const [weekKey, weekValue] of Object.entries(weeksRecord as Record<string, unknown>)) {
      if (!/^\d+$/.test(weekKey)) {
        return { error: `${periodKey} 평소 기간의 주차 번호 형식이 올바르지 않습니다.` };
      }

      const weekNumber = Number(weekKey);
      if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > maxWeeks) {
        return {
          error: `${period.label}은(는) 1~${maxWeeks}주차까지만 입력할 수 있습니다.`,
        };
      }

      if (!resolveVacationWeekDateRange(period, weekNumber)) {
        return { error: `${periodKey} 평소 기간 ${weekNumber}주차가 유효하지 않습니다.` };
      }

      if (!weekValue || typeof weekValue !== 'object' || Array.isArray(weekValue)) {
        return { error: `${periodKey} 평소 기간 ${weekNumber}주차 데이터 형식이 올바르지 않습니다.` };
      }

      const subjects: RegularWeeklyPlanWeekSubjects = {};

      for (const [subjectId, content] of Object.entries(weekValue as Record<string, unknown>)) {
        if (!options.allowedSubjectIds.has(subjectId)) {
          return { error: `등록되지 않은 과목입니다: ${subjectId}` };
        }

        const normalizedContent = normalizeWeekContent(content);
        if (normalizedContent === null) {
          return {
            error: `내용은 ${MAX_REGULAR_WEEKLY_PLAN_CONTENT_LENGTH}자 이하여야 합니다.`,
          };
        }

        if (normalizedContent) {
          subjects[subjectId] = normalizedContent;
        }
      }

      if (Object.keys(subjects).length > 0) {
        weeks[String(weekNumber)] = subjects;
      }
    }

    if (Object.keys(weeks).length > 0) {
      plans[periodKey] = { weeks };
    }
  }

  return { plans };
}

export interface RegularWeeklyPlansContextResponse {
  regularWeeklyPlans: RegularWeeklyPlans;
  regularPeriodPreview: RegularPeriodSegmentPreviewItem[];
  subjects: import('@/lib/user-subject').UserSubject[];
}

export interface RegularWeeklyPlansSaveResponse {
  regularWeeklyPlans: RegularWeeklyPlans;
}
