import {
  migrateLegacyVacationWeeklyPlanKey,
  type VacationPeriodSlot,
} from './vacation-period-settings';
import {
  listVacationWeekNumbers,
  resolveVacationWeekDateRange,
} from './vacation-week-date-range';
import type { VacationPeriod } from './school-term-periods';

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

function isVacationPeriodSlotKey(value: string): value is VacationPeriodSlot {
  return value === 'summer' || value === 'winter';
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
    if (weeks === null) {
      continue;
    }

    if (Object.keys(weeks).length === 0) {
      continue;
    }

    const existing = plans[slot]?.weeks ?? {};
    const mergedWeeks = mergeWeekMaps(existing, weeks);

    if (Object.keys(mergedWeeks).length > 0) {
      plans[slot] = { weeks: mergedWeeks };
    }
  }

  return plans;
}

function previewToPeriodMap(
  preview: VacationPeriodPreviewItem[]
): Map<VacationPeriodSlot, VacationPeriod> {
  return new Map(
    preview.map((item) => [
      item.slot,
      {
        label: item.label,
        start: item.start,
        end: item.end,
      },
    ])
  );
}

export function validateVacationWeeklyPlansInput(
  value: unknown,
  options: {
    allowedSubjectIds: ReadonlySet<string>;
    vacationPeriodPreview: VacationPeriodPreviewItem[];
  }
): { plans: VacationWeeklyPlans } | { error: string } {
  if (value === null || value === undefined) {
    return { plans: createEmptyVacationWeeklyPlans() };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'vacationWeeklyPlans 형식이 올바르지 않습니다.' };
  }

  const periodMap = previewToPeriodMap(options.vacationPeriodPreview);
  const plans: VacationWeeklyPlans = {};

  for (const [periodKey, periodValue] of Object.entries(value as Record<string, unknown>)) {
    const slot = migrateLegacyVacationWeeklyPlanKey(periodKey);
    if (!slot) {
      return { error: `지원하지 않는 방학 기간입니다: ${periodKey}` };
    }

    const period = periodMap.get(slot);
    if (!period) {
      return { error: `등록되지 않은 방학 기간입니다: ${slot}` };
    }

    if (!periodValue || typeof periodValue !== 'object' || Array.isArray(periodValue)) {
      return { error: `${slot} 방학 데이터 형식이 올바르지 않습니다.` };
    }

    const weeksRecord = (periodValue as { weeks?: unknown }).weeks ?? periodValue;
    if (!weeksRecord || typeof weeksRecord !== 'object' || Array.isArray(weeksRecord)) {
      return { error: `${slot} 방학 주차 데이터 형식이 올바르지 않습니다.` };
    }

    const maxWeeks = listVacationWeekNumbers(period).length;
    const weeks: Partial<Record<string, VacationWeeklyPlanWeekSubjects>> = {};

    for (const [weekKey, weekValue] of Object.entries(weeksRecord as Record<string, unknown>)) {
      if (!/^\d+$/.test(weekKey)) {
        return { error: `${slot} 방학의 주차 번호 형식이 올바르지 않습니다.` };
      }

      const weekNumber = Number(weekKey);
      if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > maxWeeks) {
        return {
          error: `${period.label}은(는) 1~${maxWeeks}주차까지만 입력할 수 있습니다.`,
        };
      }

      if (!resolveVacationWeekDateRange(period, weekNumber)) {
        return { error: `${slot} 방학 ${weekNumber}주차가 유효하지 않습니다.` };
      }

      if (!weekValue || typeof weekValue !== 'object' || Array.isArray(weekValue)) {
        return { error: `${slot} 방학 ${weekNumber}주차 데이터 형식이 올바르지 않습니다.` };
      }

      const subjects: VacationWeeklyPlanWeekSubjects = {};

      for (const [subjectId, content] of Object.entries(weekValue as Record<string, unknown>)) {
        if (!options.allowedSubjectIds.has(subjectId)) {
          return { error: `등록되지 않은 과목입니다: ${subjectId}` };
        }

        const normalizedContent = normalizeWeekContent(content);
        if (normalizedContent === null) {
          return {
            error: `내용은 ${MAX_VACATION_WEEKLY_PLAN_CONTENT_LENGTH}자 이하여야 합니다.`,
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
      plans[slot] = { weeks };
    }
  }

  return { plans };
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
