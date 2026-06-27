import {
  previewItemToRegularPeriod,
  type RegularPeriodSegmentPreviewItem,
} from '@/lib/regular-period-segments';
import {
  listVacationWeekNumbers,
  resolveVacationWeekDateRange,
} from '@/lib/vacation-week-date-range';
import type { VacationPeriod } from '@/lib/school-term-periods';
import {
  createWeeklyPlanItem,
  getUnscheduledWeeklyPlanItems,
  isScheduledWeeklyPlanItem,
  mergeUnscheduledWeeklyPlanItems,
  normalizeWeeklyPlanItem,
  normalizeWeeklyPlanItemArray,
  weeklyPlanItemsToMultilineText,
  MAX_WEEKLY_PLAN_ITEMS_PER_CELL,
  MAX_WEEKLY_PLAN_ITEM_TITLE_LENGTH,
  type WeeklyPlanItem,
} from '@/lib/weekly-plan-item';

export const MAX_REGULAR_WEEKLY_PLAN_ITEM_TITLE_LENGTH = MAX_WEEKLY_PLAN_ITEM_TITLE_LENGTH;
/** @deprecated use MAX_REGULAR_WEEKLY_PLAN_ITEM_TITLE_LENGTH */
export const MAX_REGULAR_WEEKLY_PLAN_CONTENT_LENGTH = MAX_REGULAR_WEEKLY_PLAN_ITEM_TITLE_LENGTH;
export const MAX_REGULAR_WEEKLY_PLAN_ITEMS_PER_CELL = MAX_WEEKLY_PLAN_ITEMS_PER_CELL;
export const MAX_REGULAR_WEEKS = 24;

export type RegularWeeklyPlanItem = WeeklyPlanItem;

export type RegularWeeklyPlanWeekSubjects = Record<string, RegularWeeklyPlanItem[]>;

export interface RegularWeeklyPlanByPeriod {
  weeks: Partial<Record<string, RegularWeeklyPlanWeekSubjects>>;
}

export type RegularWeeklyPlans = Partial<Record<string, RegularWeeklyPlanByPeriod>>;

export function createEmptyRegularWeeklyPlans(): RegularWeeklyPlans {
  return {};
}

export function createRegularWeeklyPlanItem(title: string, id?: string): RegularWeeklyPlanItem {
  return createWeeklyPlanItem(title, id);
}

export function isScheduledRegularWeeklyPlanItem(item: RegularWeeklyPlanItem): boolean {
  return isScheduledWeeklyPlanItem(item);
}

export function getUnscheduledRegularWeeklyPlanItems(
  items: RegularWeeklyPlanItem[]
): RegularWeeklyPlanItem[] {
  return getUnscheduledWeeklyPlanItems(items);
}

export function mergeUnscheduledRegularWeeklyPlanItems(
  existing: RegularWeeklyPlanItem[],
  unscheduled: RegularWeeklyPlanItem[]
): RegularWeeklyPlanItem[] {
  return mergeUnscheduledWeeklyPlanItems(existing, unscheduled);
}

export function regularWeeklyPlanItemsToMultilineText(items: RegularWeeklyPlanItem[]): string {
  return weeklyPlanItemsToMultilineText(items);
}

function normalizeItem(value: unknown): RegularWeeklyPlanItem | null {
  return normalizeWeeklyPlanItem(value);
}

function normalizeItemArray(value: unknown): RegularWeeklyPlanItem[] | null {
  return normalizeWeeklyPlanItemArray(value);
}

function normalizeWeekSubjects(value: unknown): RegularWeeklyPlanWeekSubjects | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const subjects: RegularWeeklyPlanWeekSubjects = {};

  for (const [subjectId, subjectValue] of Object.entries(value as Record<string, unknown>)) {
    if (!subjectId.trim()) {
      continue;
    }

    const items = normalizeItemArray(subjectValue);
    if (items === null) {
      return null;
    }

    if (items.length > 0) {
      subjects[subjectId] = items;
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

export function areRegularWeeklyPlansEqual(
  left: RegularWeeklyPlans,
  right: RegularWeeklyPlans
): boolean {
  return (
    JSON.stringify(resolveRegularWeeklyPlans(left)) ===
    JSON.stringify(resolveRegularWeeklyPlans(right))
  );
}

export function getRegularWeeklyPlanItems(
  plans: RegularWeeklyPlans,
  periodKey: string,
  weekNumber: number,
  subjectId: string
): RegularWeeklyPlanItem[] {
  return plans[periodKey]?.weeks?.[String(weekNumber)]?.[subjectId] ?? [];
}

export function getUnscheduledRegularWeeklyPlanItemsForCell(
  plans: RegularWeeklyPlans,
  periodKey: string,
  weekNumber: number,
  subjectId: string
): RegularWeeklyPlanItem[] {
  return getUnscheduledRegularWeeklyPlanItems(
    getRegularWeeklyPlanItems(plans, periodKey, weekNumber, subjectId)
  );
}

export function findRegularWeeklyPlanItem(
  plans: RegularWeeklyPlans,
  periodKey: string,
  weekNumber: number,
  subjectId: string,
  itemId: string
): RegularWeeklyPlanItem | null {
  return (
    getRegularWeeklyPlanItems(plans, periodKey, weekNumber, subjectId).find(
      (item) => item.id === itemId
    ) ?? null
  );
}

/** @deprecated templates / legacy callers — prefer getRegularWeeklyPlanItems */
export function getRegularWeeklyPlanContent(
  plans: RegularWeeklyPlans,
  periodKey: string,
  weekNumber: number,
  subjectId: string
): string | null {
  const text = regularWeeklyPlanItemsToMultilineText(
    getRegularWeeklyPlanItems(plans, periodKey, weekNumber, subjectId)
  );
  return text.trim() ? text : null;
}

export function writeRegularWeeklyPlanItemsForCell(
  plans: RegularWeeklyPlans,
  periodKey: string,
  weekNumber: number,
  subjectId: string,
  unscheduledItems: RegularWeeklyPlanItem[]
): RegularWeeklyPlans {
  const weekKey = String(weekNumber);
  const periodPlan = plans[periodKey] ?? { weeks: {} };
  const existing = periodPlan.weeks[weekKey]?.[subjectId] ?? [];
  const merged = mergeUnscheduledRegularWeeklyPlanItems(existing, unscheduledItems);

  const weekSubjects = { ...(periodPlan.weeks[weekKey] ?? {}) };

  if (merged.length > 0) {
    weekSubjects[subjectId] = merged;
  } else {
    delete weekSubjects[subjectId];
  }

  const nextWeeks = { ...periodPlan.weeks };
  if (Object.keys(weekSubjects).length > 0) {
    nextWeeks[weekKey] = weekSubjects;
  } else {
    delete nextWeeks[weekKey];
  }

  const nextPlans = { ...plans };
  if (Object.keys(nextWeeks).length > 0) {
    nextPlans[periodKey] = { weeks: nextWeeks };
  } else {
    delete nextPlans[periodKey];
  }

  return nextPlans;
}

export function setRegularWeeklyPlanItemScheduledTodoId(
  plans: RegularWeeklyPlans,
  periodKey: string,
  weekNumber: number,
  subjectId: string,
  itemId: string,
  scheduledTodoId: number
): RegularWeeklyPlans {
  const weekKey = String(weekNumber);
  const periodPlan = plans[periodKey];
  if (!periodPlan?.weeks?.[weekKey]?.[subjectId]) {
    return plans;
  }

  const items = periodPlan.weeks[weekKey]![subjectId]!.map((item) =>
    item.id === itemId ? { ...item, scheduledTodoId } : item
  );

  return {
    ...plans,
    [periodKey]: {
      weeks: {
        ...periodPlan.weeks,
        [weekKey]: {
          ...periodPlan.weeks[weekKey],
          [subjectId]: items,
        },
      },
    },
  };
}

export function clearRegularWeeklyPlanItemScheduledTodoId(
  plans: RegularWeeklyPlans,
  periodKey: string,
  weekNumber: number,
  subjectId: string,
  itemId: string
): RegularWeeklyPlans {
  const weekKey = String(weekNumber);
  const periodPlan = plans[periodKey];
  if (!periodPlan?.weeks?.[weekKey]?.[subjectId]) {
    return plans;
  }

  const items = periodPlan.weeks[weekKey]![subjectId]!.map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    const { scheduledTodoId: _removed, ...rest } = item;
    return rest;
  });

  return {
    ...plans,
    [periodKey]: {
      weeks: {
        ...periodPlan.weeks,
        [weekKey]: {
          ...periodPlan.weeks[weekKey],
          [subjectId]: items,
        },
      },
    },
  };
}

export function clearRegularWeeklyPlanScheduledTodoIdByTodoId(
  plans: RegularWeeklyPlans,
  scheduledTodoId: number
): RegularWeeklyPlans {
  if (!Number.isInteger(scheduledTodoId) || scheduledTodoId <= 0) {
    return plans;
  }

  let changed = false;
  const nextPlans: RegularWeeklyPlans = { ...plans };

  for (const [periodKey, periodPlan] of Object.entries(nextPlans)) {
    if (!periodPlan?.weeks) {
      continue;
    }

    const nextWeeks = { ...periodPlan.weeks };

    for (const [weekKey, weekSubjects] of Object.entries(nextWeeks)) {
      if (!weekSubjects) {
        continue;
      }

      const nextSubjects = { ...weekSubjects };

      for (const [subjectId, items] of Object.entries(nextSubjects)) {
        if (!items) {
          continue;
        }

        const nextItems = items.map((item) => {
          if (item.scheduledTodoId !== scheduledTodoId) {
            return item;
          }

          changed = true;
          const { scheduledTodoId: _removed, ...rest } = item;
          return rest;
        });

        nextSubjects[subjectId] = nextItems;
      }

      nextWeeks[weekKey] = nextSubjects;
    }

    nextPlans[periodKey] = { weeks: nextWeeks };
  }

  return changed ? nextPlans : plans;
}

export function removeRegularWeeklyPlanItemFromCell(
  plans: RegularWeeklyPlans,
  periodKey: string,
  weekNumber: number,
  subjectId: string,
  itemId: string
): RegularWeeklyPlans {
  const weekKey = String(weekNumber);
  const periodPlan = plans[periodKey];
  if (!periodPlan?.weeks?.[weekKey]?.[subjectId]) {
    return plans;
  }

  const remaining = periodPlan.weeks[weekKey]![subjectId]!.filter((item) => item.id !== itemId);
  const weekSubjects = { ...(periodPlan.weeks[weekKey] ?? {}) };

  if (remaining.length > 0) {
    weekSubjects[subjectId] = remaining;
  } else {
    delete weekSubjects[subjectId];
  }

  const nextWeeks = { ...periodPlan.weeks };
  if (Object.keys(weekSubjects).length > 0) {
    nextWeeks[weekKey] = weekSubjects;
  } else {
    delete nextWeeks[weekKey];
  }

  const nextPlans = { ...plans };
  if (Object.keys(nextWeeks).length > 0) {
    nextPlans[periodKey] = { weeks: nextWeeks };
  } else {
    delete nextPlans[periodKey];
  }

  return nextPlans;
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

      for (const [subjectId, subjectItems] of Object.entries(weekValue as Record<string, unknown>)) {
        if (!options.allowedSubjectIds.has(subjectId)) {
          return { error: `등록되지 않은 과목입니다: ${subjectId}` };
        }

        const items = normalizeItemArray(subjectItems);
        if (items === null) {
          if (
            Array.isArray(subjectItems) &&
            subjectItems.length > MAX_REGULAR_WEEKLY_PLAN_ITEMS_PER_CELL
          ) {
            return {
              error: `한 과목·주차당 최대 ${MAX_REGULAR_WEEKLY_PLAN_ITEMS_PER_CELL}개까지 입력할 수 있습니다.`,
            };
          }

          return {
            error: `항목 제목은 ${MAX_REGULAR_WEEKLY_PLAN_ITEM_TITLE_LENGTH}자 이하여야 합니다.`,
          };
        }

        if (items.length > 0) {
          subjects[subjectId] = items;
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

function ymdToIsoDateForStudyPlanApi(ymd: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return ymd;
  }

  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function addDays(ymd: string, days: number): string {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6)) - 1;
  const day = Number(ymd.slice(6, 8));
  const date = new Date(year, month, day);
  date.setDate(date.getDate() + days);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** Inclusive regular period start through last day; `end` is exclusive for study-plan-todos API. */
export function resolveStudyPlanTodoQueryRangeForRegular(
  preview: RegularPeriodSegmentPreviewItem[]
): { start: string; end: string } | null {
  if (preview.length === 0) {
    return null;
  }

  let startYmd = preview[0]!.start;
  let lastInclusiveDayYmd = preview[0]!.end;

  for (const period of preview) {
    if (period.start < startYmd) {
      startYmd = period.start;
    }
    if (period.end > lastInclusiveDayYmd) {
      lastInclusiveDayYmd = period.end;
    }
  }

  return {
    start: ymdToIsoDateForStudyPlanApi(startYmd),
    end: ymdToIsoDateForStudyPlanApi(addDays(lastInclusiveDayYmd, 1)),
  };
}

export interface RegularWeeklyPlansContextResponse {
  regularWeeklyPlans: RegularWeeklyPlans;
  regularPeriodPreview: RegularPeriodSegmentPreviewItem[];
  subjects: import('@/lib/user-subject').UserSubject[];
}

export interface RegularWeeklyPlansSaveResponse {
  regularWeeklyPlans: RegularWeeklyPlans;
}
