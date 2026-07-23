import {
  migrateLegacyVacationWeeklyPlanKey,
  type VacationPeriodSlot,
} from '@/lib/vacation-period-settings';
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

export const MAX_VACATION_WEEKLY_PLAN_ITEM_TITLE_LENGTH = MAX_WEEKLY_PLAN_ITEM_TITLE_LENGTH;
/** @deprecated use MAX_VACATION_WEEKLY_PLAN_ITEM_TITLE_LENGTH */
export const MAX_VACATION_WEEKLY_PLAN_CONTENT_LENGTH = MAX_VACATION_WEEKLY_PLAN_ITEM_TITLE_LENGTH;
export const MAX_VACATION_WEEKLY_PLAN_ITEMS_PER_CELL = MAX_WEEKLY_PLAN_ITEMS_PER_CELL;
export const MAX_VACATION_WEEKS = 16;

export type VacationWeeklyPlanItem = WeeklyPlanItem;

export type VacationWeeklyPlanWeekSubjects = Record<string, VacationWeeklyPlanItem[]>;

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

export function createVacationWeeklyPlanItem(title: string, id?: string): VacationWeeklyPlanItem {
  return createWeeklyPlanItem(title, id);
}

export function isScheduledVacationWeeklyPlanItem(item: VacationWeeklyPlanItem): boolean {
  return isScheduledWeeklyPlanItem(item);
}

export function getUnscheduledVacationWeeklyPlanItems(
  items: VacationWeeklyPlanItem[]
): VacationWeeklyPlanItem[] {
  return getUnscheduledWeeklyPlanItems(items);
}

export function mergeUnscheduledVacationWeeklyPlanItems(
  existing: VacationWeeklyPlanItem[],
  unscheduled: VacationWeeklyPlanItem[]
): VacationWeeklyPlanItem[] {
  return mergeUnscheduledWeeklyPlanItems(existing, unscheduled);
}

export function vacationWeeklyPlanItemsToMultilineText(items: VacationWeeklyPlanItem[]): string {
  return weeklyPlanItemsToMultilineText(items);
}

function isVacationPeriodSlotKey(value: string): value is VacationPeriodSlot {
  return value === 'summer' || value === 'winter';
}

function normalizeItem(value: unknown): VacationWeeklyPlanItem | null {
  return normalizeWeeklyPlanItem(value);
}

function normalizeItemArray(value: unknown): VacationWeeklyPlanItem[] | null {
  return normalizeWeeklyPlanItemArray(value);
}

function normalizeWeekSubjects(value: unknown): VacationWeeklyPlanWeekSubjects | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const subjects: VacationWeeklyPlanWeekSubjects = {};

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

      for (const [subjectId, subjectItems] of Object.entries(weekValue as Record<string, unknown>)) {
        if (!options.allowedSubjectIds.has(subjectId)) {
          return { error: `등록되지 않은 과목입니다: ${subjectId}` };
        }

        const items = normalizeItemArray(subjectItems);
        if (items === null) {
          if (Array.isArray(subjectItems) && subjectItems.length > MAX_VACATION_WEEKLY_PLAN_ITEMS_PER_CELL) {
            return {
              error: `한 과목·주차당 최대 ${MAX_VACATION_WEEKLY_PLAN_ITEMS_PER_CELL}개까지 입력할 수 있습니다.`,
            };
          }

          return {
            error: `항목 제목은 ${MAX_VACATION_WEEKLY_PLAN_ITEM_TITLE_LENGTH}자 이하여야 합니다.`,
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
      plans[slot] = { weeks };
    }
  }

  return { plans };
}

export function areVacationWeeklyPlansEqual(
  left: VacationWeeklyPlans,
  right: VacationWeeklyPlans
): boolean {
  return (
    JSON.stringify(resolveVacationWeeklyPlans(left)) ===
    JSON.stringify(resolveVacationWeeklyPlans(right))
  );
}

export function getVacationWeeklyPlanItems(
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot,
  weekNumber: number,
  subjectId: string
): VacationWeeklyPlanItem[] {
  return plans[periodKey]?.weeks?.[String(weekNumber)]?.[subjectId] ?? [];
}

export function getUnscheduledVacationWeeklyPlanItemsForCell(
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot,
  weekNumber: number,
  subjectId: string
): VacationWeeklyPlanItem[] {
  return getUnscheduledVacationWeeklyPlanItems(
    getVacationWeeklyPlanItems(plans, periodKey, weekNumber, subjectId)
  );
}

export function findVacationWeeklyPlanItem(
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot,
  weekNumber: number,
  subjectId: string,
  itemId: string
): VacationWeeklyPlanItem | null {
  return (
    getVacationWeeklyPlanItems(plans, periodKey, weekNumber, subjectId).find(
      (item) => item.id === itemId
    ) ?? null
  );
}

/** @deprecated templates / legacy callers — prefer getVacationWeeklyPlanItems */
export function getVacationWeeklyPlanContent(
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot,
  weekNumber: number,
  subjectId: string
): string | null {
  const text = vacationWeeklyPlanItemsToMultilineText(
    getVacationWeeklyPlanItems(plans, periodKey, weekNumber, subjectId)
  );
  return text.trim() ? text : null;
}

export function writeVacationWeeklyPlanItemsForCell(
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot,
  weekNumber: number,
  subjectId: string,
  unscheduledItems: VacationWeeklyPlanItem[]
): VacationWeeklyPlans {
  const weekKey = String(weekNumber);
  const periodPlan = plans[periodKey] ?? { weeks: {} };
  const existing = periodPlan.weeks[weekKey]?.[subjectId] ?? [];
  const merged = mergeUnscheduledVacationWeeklyPlanItems(existing, unscheduledItems);

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

export function hasVacationWeekContent(
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot,
  weekNumber: number,
  subjectIds: string[]
): boolean {
  for (const subjectId of subjectIds) {
    if (
      getVacationWeeklyPlanItems(plans, periodKey, weekNumber, subjectId).length > 0
    ) {
      return true;
    }
  }

  return false;
}

/**
 * 소스 주차의 과목별 항목을 제목만 복제해 대상 주차 뒤에 이어 붙인다.
 * scheduledTodoId는 복사하지 않으며, 대상 주차의 기존 항목은 유지된다.
 */
export function copyVacationWeeklyPlanWeekAppend(
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot,
  sourceWeekNumber: number,
  targetWeekNumber: number,
  subjectIds: string[]
): VacationWeeklyPlans | { error: string } {
  if (sourceWeekNumber === targetWeekNumber) {
    return plans;
  }

  let nextPlans = plans;

  for (const subjectId of subjectIds) {
    const sourceItems = getVacationWeeklyPlanItems(
      plans,
      periodKey,
      sourceWeekNumber,
      subjectId
    );

    if (sourceItems.length === 0) {
      continue;
    }

    const targetItems = getVacationWeeklyPlanItems(
      nextPlans,
      periodKey,
      targetWeekNumber,
      subjectId
    );
    const remainingSlots =
      MAX_VACATION_WEEKLY_PLAN_ITEMS_PER_CELL - targetItems.length;

    if (sourceItems.length > remainingSlots) {
      return {
        error:
          remainingSlots > 0
            ? `복사할 항목이 많아 대상 주차 일부 칸에 ${remainingSlots}개만 더 추가할 수 있습니다.`
            : `대상 주차에 이미 칸당 최대 ${MAX_VACATION_WEEKLY_PLAN_ITEMS_PER_CELL}개가 있어 복사할 수 없습니다.`,
      };
    }

    const clonedItems = sourceItems.map((item) =>
      createVacationWeeklyPlanItem(item.title)
    );
    const weekKey = String(targetWeekNumber);
    const periodPlan = nextPlans[periodKey] ?? { weeks: {} };
    const weekSubjects = { ...(periodPlan.weeks[weekKey] ?? {}) };
    weekSubjects[subjectId] = [...targetItems, ...clonedItems];

    nextPlans = {
      ...nextPlans,
      [periodKey]: {
        weeks: {
          ...periodPlan.weeks,
          [weekKey]: weekSubjects,
        },
      },
    };
  }

  return nextPlans;
}

export function setVacationWeeklyPlanItemScheduledTodoId(
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot,
  weekNumber: number,
  subjectId: string,
  itemId: string,
  scheduledTodoId: number
): VacationWeeklyPlans {
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

export function clearVacationWeeklyPlanItemScheduledTodoId(
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot,
  weekNumber: number,
  subjectId: string,
  itemId: string
): VacationWeeklyPlans {
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

export function clearVacationWeeklyPlanScheduledTodoIdByTodoId(
  plans: VacationWeeklyPlans,
  scheduledTodoId: number
): VacationWeeklyPlans {
  if (!Number.isInteger(scheduledTodoId) || scheduledTodoId <= 0) {
    return plans;
  }

  let changed = false;
  const nextPlans: VacationWeeklyPlans = { ...plans };
  const slots: VacationPeriodSlot[] = ['summer', 'winter'];

  for (const periodKey of slots) {
    const periodPlan = nextPlans[periodKey];
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

export function removeVacationWeeklyPlanItemFromCell(
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot,
  weekNumber: number,
  subjectId: string,
  itemId: string
): VacationWeeklyPlans {
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

export function previewItemToVacationPeriod(item: VacationPeriodPreviewItem): VacationPeriod {
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

export { isVacationPeriodSlotKey };

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

/** Inclusive vacation start through last day; `end` is exclusive for study-plan-todos API. */
export function resolveStudyPlanTodoQueryRangeForVacation(
  preview: VacationPeriodPreviewItem[]
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
