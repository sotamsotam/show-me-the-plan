import { randomUUID } from 'node:crypto';

export const MAX_WEEKLY_PLAN_ITEM_TITLE_LENGTH = 500;
export const MAX_WEEKLY_PLAN_ITEMS_PER_CELL = 30;

export interface WeeklyPlanItem {
  id: string;
  title: string;
  scheduledTodoId?: number;
}

export function createWeeklyPlanItem(title: string, id?: string): WeeklyPlanItem {
  return {
    id: id ?? randomUUID(),
    title: title.trim(),
  };
}

export function isScheduledWeeklyPlanItem(item: WeeklyPlanItem): boolean {
  return typeof item.scheduledTodoId === 'number' && item.scheduledTodoId > 0;
}

export function getUnscheduledWeeklyPlanItems(items: WeeklyPlanItem[]): WeeklyPlanItem[] {
  return items.filter((item) => !isScheduledWeeklyPlanItem(item));
}

export function mergeUnscheduledWeeklyPlanItems(
  existing: WeeklyPlanItem[],
  unscheduled: WeeklyPlanItem[]
): WeeklyPlanItem[] {
  const scheduled = existing.filter((item) => isScheduledWeeklyPlanItem(item));
  return [...scheduled, ...unscheduled];
}

export function titlesToWeeklyPlanItems(titles: string[]): WeeklyPlanItem[] {
  return titles
    .map((title) => title.trim())
    .filter(Boolean)
    .map((title) => createWeeklyPlanItem(title));
}

export function parseWeeklyPlanItemTitlesFromMultilineText(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function weeklyPlanItemsToMultilineText(items: WeeklyPlanItem[]): string {
  return items.map((item) => item.title).join('\n');
}

export function normalizeScheduledTodoId(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const todoId = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(todoId) || todoId <= 0) {
    return undefined;
  }

  return todoId;
}

export function normalizeWeeklyPlanItemId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > 64) {
    return null;
  }

  return normalized;
}

export function normalizeWeeklyPlanItemTitle(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return '';
  }

  if (normalized.length > MAX_WEEKLY_PLAN_ITEM_TITLE_LENGTH) {
    return null;
  }

  return normalized;
}

export function normalizeWeeklyPlanItem(value: unknown): WeeklyPlanItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = normalizeWeeklyPlanItemId(record.id);
  const title = normalizeWeeklyPlanItemTitle(record.title);

  if (!id || title === null) {
    return null;
  }

  if (!title) {
    return null;
  }

  const scheduledTodoId = normalizeScheduledTodoId(record.scheduledTodoId);
  if (scheduledTodoId) {
    return { id, title, scheduledTodoId };
  }

  return { id, title };
}

export function normalizeWeeklyPlanItemArray(value: unknown): WeeklyPlanItem[] | null {
  if (typeof value === 'string') {
    const titles = parseWeeklyPlanItemTitlesFromMultilineText(value);
    return titlesToWeeklyPlanItems(titles);
  }

  if (!Array.isArray(value)) {
    return null;
  }

  if (value.length > MAX_WEEKLY_PLAN_ITEMS_PER_CELL) {
    return null;
  }

  const items: WeeklyPlanItem[] = [];

  for (const entry of value) {
    const item = normalizeWeeklyPlanItem(entry);
    if (!item) {
      return null;
    }

    items.push(item);
  }

  return items;
}
