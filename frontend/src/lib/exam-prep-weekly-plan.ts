import {
  EXAM_ROUND_SLOTS,
  MAX_EXAM_PREP_WEEKS,
  MIN_EXAM_PREP_WEEKS,
  type ExamPrepWeeksByRound,
  type ExamRoundPreviewItem,
  type ExamRoundSlot,
} from '@/lib/exam-countdown';
import type { ExamPeriodSettings } from '@/lib/exam-period-settings';
import type { UserSubject } from '@/lib/user-subject';
import {
  appendWeeklyPlanItemsFromTitles,
  createWeeklyPlanItem,
  getUnscheduledWeeklyPlanItems,
  isScheduledWeeklyPlanItem,
  mergeUnscheduledWeeklyPlanItems,
  normalizeWeeklyPlanItem,
  parseWeeklyPlanItemTitlesFromMultilineText,
  reorderWeeklyPlanItems,
  titlesToWeeklyPlanItems,
  weeklyPlanItemsToMultilineText,
  MAX_WEEKLY_PLAN_ITEMS_PER_CELL,
  MAX_WEEKLY_PLAN_ITEM_TITLE_LENGTH,
  type WeeklyPlanItem,
} from '@/lib/weekly-plan-item';

export const MAX_EXAM_PREP_WEEKLY_PLAN_ITEM_TITLE_LENGTH = MAX_WEEKLY_PLAN_ITEM_TITLE_LENGTH;
/** @deprecated use MAX_EXAM_PREP_WEEKLY_PLAN_ITEM_TITLE_LENGTH */
export const MAX_EXAM_PREP_WEEKLY_PLAN_CONTENT_LENGTH = MAX_EXAM_PREP_WEEKLY_PLAN_ITEM_TITLE_LENGTH;
export const MAX_EXAM_PREP_WEEKLY_PLAN_ITEMS_PER_CELL = MAX_WEEKLY_PLAN_ITEMS_PER_CELL;

export type ExamPrepWeeklyPlanItem = WeeklyPlanItem;

export type ExamPrepWeeklyPlanWeekSubjects = Record<string, ExamPrepWeeklyPlanItem[]>;

export interface ExamPrepWeeklyPlanByRound {
  weeks: Partial<Record<string, ExamPrepWeeklyPlanWeekSubjects>>;
}

export type ExamPrepWeeklyPlans = Partial<Record<ExamRoundSlot, ExamPrepWeeklyPlanByRound>>;

export function createEmptyExamPrepWeeklyPlans(): ExamPrepWeeklyPlans {
  return {};
}

export function createExamPrepWeeklyPlanItem(title: string, id?: string): ExamPrepWeeklyPlanItem {
  return createWeeklyPlanItem(title, id);
}

export function isScheduledExamPrepWeeklyPlanItem(item: ExamPrepWeeklyPlanItem): boolean {
  return isScheduledWeeklyPlanItem(item);
}

export function getUnscheduledExamPrepWeeklyPlanItems(
  items: ExamPrepWeeklyPlanItem[]
): ExamPrepWeeklyPlanItem[] {
  return getUnscheduledWeeklyPlanItems(items);
}

export function mergeUnscheduledExamPrepWeeklyPlanItems(
  existing: ExamPrepWeeklyPlanItem[],
  unscheduled: ExamPrepWeeklyPlanItem[]
): ExamPrepWeeklyPlanItem[] {
  return mergeUnscheduledWeeklyPlanItems(existing, unscheduled);
}

export function titlesToExamPrepWeeklyPlanItems(titles: string[]): ExamPrepWeeklyPlanItem[] {
  return titlesToWeeklyPlanItems(titles);
}

export { parseWeeklyPlanItemTitlesFromMultilineText };

export function appendExamPrepWeeklyPlanItemsFromTitles(
  items: ExamPrepWeeklyPlanItem[],
  titles: string[]
): { items: ExamPrepWeeklyPlanItem[] } | { error: string } {
  return appendWeeklyPlanItemsFromTitles(items, titles, {
    maxTitleLength: MAX_EXAM_PREP_WEEKLY_PLAN_ITEM_TITLE_LENGTH,
    maxItemsPerCell: MAX_EXAM_PREP_WEEKLY_PLAN_ITEMS_PER_CELL,
  });
}

export function reorderExamPrepWeeklyPlanItems(
  items: ExamPrepWeeklyPlanItem[],
  fromIndex: number,
  toIndex: number
): ExamPrepWeeklyPlanItem[] {
  return reorderWeeklyPlanItems(items, fromIndex, toIndex);
}

export function examPrepWeeklyPlanItemsToMultilineText(items: ExamPrepWeeklyPlanItem[]): string {
  return weeklyPlanItemsToMultilineText(items);
}

function isExamRoundSlot(value: string): value is ExamRoundSlot {
  return (EXAM_ROUND_SLOTS as readonly string[]).includes(value);
}

function normalizeItem(value: unknown): ExamPrepWeeklyPlanItem | null {
  return normalizeWeeklyPlanItem(value);
}

function normalizeItemArray(value: unknown): ExamPrepWeeklyPlanItem[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (value.length > MAX_EXAM_PREP_WEEKLY_PLAN_ITEMS_PER_CELL) {
    return null;
  }

  const items: ExamPrepWeeklyPlanItem[] = [];

  for (const entry of value) {
    const item = normalizeItem(entry);
    if (!item) {
      return null;
    }

    items.push(item);
  }

  return items;
}

function normalizeWeekSubjects(value: unknown): ExamPrepWeeklyPlanWeekSubjects | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const subjects: ExamPrepWeeklyPlanWeekSubjects = {};

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

function normalizeWeeksByRound(
  value: unknown
): Partial<Record<string, ExamPrepWeeklyPlanWeekSubjects>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const weeks: Partial<Record<string, ExamPrepWeeklyPlanWeekSubjects>> = {};

  for (const [weekKey, weekValue] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d+$/.test(weekKey)) {
      continue;
    }

    const weekNumber = Number(weekKey);
    if (
      !Number.isInteger(weekNumber) ||
      weekNumber < MIN_EXAM_PREP_WEEKS ||
      weekNumber > MAX_EXAM_PREP_WEEKS
    ) {
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

export function resolveExamPrepWeeklyPlans(value: unknown): ExamPrepWeeklyPlans {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createEmptyExamPrepWeeklyPlans();
  }

  const plans: ExamPrepWeeklyPlans = {};

  for (const [slotKey, roundValue] of Object.entries(value as Record<string, unknown>)) {
    if (!isExamRoundSlot(slotKey)) {
      continue;
    }

    if (!roundValue || typeof roundValue !== 'object' || Array.isArray(roundValue)) {
      continue;
    }

    const weeksRecord = (roundValue as { weeks?: unknown }).weeks ?? roundValue;
    const weeks = normalizeWeeksByRound(weeksRecord);
    if (weeks === null) {
      continue;
    }

    if (Object.keys(weeks).length > 0) {
      plans[slotKey] = { weeks };
    }
  }

  return plans;
}

function getWeeksForSlot(slot: ExamRoundSlot, settings: ExamPrepWeeksByRound): number {
  return settings.weeksBySlot[slot] ?? settings.defaultWeeks;
}

export function validateExamPrepWeeklyPlansInput(
  value: unknown,
  options: {
    allowedSubjectIds: ReadonlySet<string>;
    examPrepWeeksByRound: ExamPrepWeeksByRound;
  }
): { plans: ExamPrepWeeklyPlans } | { error: string } {
  if (value === null || value === undefined) {
    return { plans: createEmptyExamPrepWeeklyPlans() };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'examPrepWeeklyPlans 형식이 올바르지 않습니다.' };
  }

  const plans: ExamPrepWeeklyPlans = {};

  for (const [slotKey, roundValue] of Object.entries(value as Record<string, unknown>)) {
    if (!isExamRoundSlot(slotKey)) {
      return { error: `지원하지 않는 시험 회차입니다: ${slotKey}` };
    }

    if (!roundValue || typeof roundValue !== 'object' || Array.isArray(roundValue)) {
      return { error: `${slotKey} 회차 데이터 형식이 올바르지 않습니다.` };
    }

    const weeksRecord = (roundValue as { weeks?: unknown }).weeks ?? roundValue;
    if (!weeksRecord || typeof weeksRecord !== 'object' || Array.isArray(weeksRecord)) {
      return { error: `${slotKey} 회차 주차 데이터 형식이 올바르지 않습니다.` };
    }

    const maxWeeks = getWeeksForSlot(slotKey, options.examPrepWeeksByRound);
    const weeks: Partial<Record<string, ExamPrepWeeklyPlanWeekSubjects>> = {};

    for (const [weekKey, weekValue] of Object.entries(weeksRecord as Record<string, unknown>)) {
      if (!/^\d+$/.test(weekKey)) {
        return { error: `${slotKey} 회차의 주차 번호 형식이 올바르지 않습니다.` };
      }

      const weekNumber = Number(weekKey);
      if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > maxWeeks) {
        return {
          error: `${slotKey} 회차는 1~${maxWeeks}주차까지만 입력할 수 있습니다.`,
        };
      }

      if (!weekValue || typeof weekValue !== 'object' || Array.isArray(weekValue)) {
        return { error: `${slotKey} 회차 ${weekNumber}주차 데이터 형식이 올바르지 않습니다.` };
      }

      const subjects: ExamPrepWeeklyPlanWeekSubjects = {};

      for (const [subjectId, subjectItems] of Object.entries(weekValue as Record<string, unknown>)) {
        if (!options.allowedSubjectIds.has(subjectId)) {
          return { error: `등록되지 않은 과목입니다: ${subjectId}` };
        }

        const items = normalizeItemArray(subjectItems);
        if (items === null) {
          if (Array.isArray(subjectItems) && subjectItems.length > MAX_EXAM_PREP_WEEKLY_PLAN_ITEMS_PER_CELL) {
            return {
              error: `한 과목·주차당 최대 ${MAX_EXAM_PREP_WEEKLY_PLAN_ITEMS_PER_CELL}개까지 입력할 수 있습니다.`,
            };
          }

          return {
            error: `항목 제목은 ${MAX_EXAM_PREP_WEEKLY_PLAN_ITEM_TITLE_LENGTH}자 이하여야 합니다.`,
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
      plans[slotKey] = { weeks };
    }
  }

  return { plans };
}

export function areExamPrepWeeklyPlansEqual(
  left: ExamPrepWeeklyPlans,
  right: ExamPrepWeeklyPlans
): boolean {
  return (
    JSON.stringify(resolveExamPrepWeeklyPlans(left)) ===
    JSON.stringify(resolveExamPrepWeeklyPlans(right))
  );
}

export function getExamPrepWeeklyPlanItems(
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot,
  weekNumber: number,
  subjectId: string
): ExamPrepWeeklyPlanItem[] {
  return plans[roundSlot]?.weeks?.[String(weekNumber)]?.[subjectId] ?? [];
}

export function getUnscheduledExamPrepWeeklyPlanItemsForCell(
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot,
  weekNumber: number,
  subjectId: string
): ExamPrepWeeklyPlanItem[] {
  return getUnscheduledExamPrepWeeklyPlanItems(
    getExamPrepWeeklyPlanItems(plans, roundSlot, weekNumber, subjectId)
  );
}

export function findExamPrepWeeklyPlanItem(
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot,
  weekNumber: number,
  subjectId: string,
  itemId: string
): ExamPrepWeeklyPlanItem | null {
  return (
    getExamPrepWeeklyPlanItems(plans, roundSlot, weekNumber, subjectId).find(
      (item) => item.id === itemId
    ) ?? null
  );
}

export function writeExamPrepWeeklyPlanItemsForCell(
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot,
  weekNumber: number,
  subjectId: string,
  unscheduledItems: ExamPrepWeeklyPlanItem[]
): ExamPrepWeeklyPlans {
  const weekKey = String(weekNumber);
  const roundPlan = plans[roundSlot] ?? { weeks: {} };
  const existing = roundPlan.weeks[weekKey]?.[subjectId] ?? [];
  const merged = mergeUnscheduledExamPrepWeeklyPlanItems(existing, unscheduledItems);

  const weekSubjects = { ...(roundPlan.weeks[weekKey] ?? {}) };

  if (merged.length > 0) {
    weekSubjects[subjectId] = merged;
  } else {
    delete weekSubjects[subjectId];
  }

  const nextWeeks = { ...roundPlan.weeks };
  if (Object.keys(weekSubjects).length > 0) {
    nextWeeks[weekKey] = weekSubjects;
  } else {
    delete nextWeeks[weekKey];
  }

  const nextPlans = { ...plans };
  if (Object.keys(nextWeeks).length > 0) {
    nextPlans[roundSlot] = { weeks: nextWeeks };
  } else {
    delete nextPlans[roundSlot];
  }

  return nextPlans;
}

export function setExamPrepWeeklyPlanItemScheduledTodoId(
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot,
  weekNumber: number,
  subjectId: string,
  itemId: string,
  scheduledTodoId: number
): ExamPrepWeeklyPlans {
  const weekKey = String(weekNumber);
  const roundPlan = plans[roundSlot];
  if (!roundPlan?.weeks?.[weekKey]?.[subjectId]) {
    return plans;
  }

  const items = roundPlan.weeks[weekKey]![subjectId]!.map((item) =>
    item.id === itemId ? { ...item, scheduledTodoId } : item
  );

  return {
    ...plans,
    [roundSlot]: {
      weeks: {
        ...roundPlan.weeks,
        [weekKey]: {
          ...roundPlan.weeks[weekKey],
          [subjectId]: items,
        },
      },
    },
  };
}

export function removeExamPrepWeeklyPlanItemFromCell(
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot,
  weekNumber: number,
  subjectId: string,
  itemId: string
): ExamPrepWeeklyPlans {
  const weekKey = String(weekNumber);
  const roundPlan = plans[roundSlot];
  if (!roundPlan?.weeks?.[weekKey]?.[subjectId]) {
    return plans;
  }

  const remaining = roundPlan.weeks[weekKey]![subjectId]!.filter((item) => item.id !== itemId);
  const weekSubjects = { ...(roundPlan.weeks[weekKey] ?? {}) };

  if (remaining.length > 0) {
    weekSubjects[subjectId] = remaining;
  } else {
    delete weekSubjects[subjectId];
  }

  const nextWeeks = { ...roundPlan.weeks };
  if (Object.keys(weekSubjects).length > 0) {
    nextWeeks[weekKey] = weekSubjects;
  } else {
    delete nextWeeks[weekKey];
  }

  const nextPlans = { ...plans };
  if (Object.keys(nextWeeks).length > 0) {
    nextPlans[roundSlot] = { weeks: nextWeeks };
  } else {
    delete nextPlans[roundSlot];
  }

  return nextPlans;
}

export function clearExamPrepWeeklyPlanItemScheduledTodoId(
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot,
  weekNumber: number,
  subjectId: string,
  itemId: string
): ExamPrepWeeklyPlans {
  const weekKey = String(weekNumber);
  const roundPlan = plans[roundSlot];
  if (!roundPlan?.weeks?.[weekKey]?.[subjectId]) {
    return plans;
  }

  const items = roundPlan.weeks[weekKey]![subjectId]!.map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    const { scheduledTodoId: _removed, ...rest } = item;
    return rest;
  });

  return {
    ...plans,
    [roundSlot]: {
      weeks: {
        ...roundPlan.weeks,
        [weekKey]: {
          ...roundPlan.weeks[weekKey],
          [subjectId]: items,
        },
      },
    },
  };
}

export function clearExamPrepWeeklyPlanScheduledTodoIdByTodoId(
  plans: ExamPrepWeeklyPlans,
  scheduledTodoId: number
): ExamPrepWeeklyPlans {
  if (!Number.isInteger(scheduledTodoId) || scheduledTodoId <= 0) {
    return plans;
  }

  let changed = false;
  const nextPlans: ExamPrepWeeklyPlans = { ...plans };

  for (const roundSlot of EXAM_ROUND_SLOTS) {
    const roundPlan = nextPlans[roundSlot];
    if (!roundPlan?.weeks) {
      continue;
    }

    const nextWeeks = { ...roundPlan.weeks };

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

    nextPlans[roundSlot] = { weeks: nextWeeks };
  }

  return changed ? nextPlans : plans;
}

export interface ExamPrepWeeklyPlansContextResponse {
  examPrepWeeksBefore: number;
  examPrepWeeksByRound: ExamPrepWeeksByRound;
  examPrepWeeklyPlans: ExamPrepWeeklyPlans;
  subjects: UserSubject[];
  examRoundPreview: ExamRoundPreviewItem[];
  examPeriodSettings?: ExamPeriodSettings | null;
}

export interface ExamPrepWeeklyPlansSaveResponse {
  examPrepWeeklyPlans: ExamPrepWeeklyPlans;
}
