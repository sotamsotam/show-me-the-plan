import {
  getUnscheduledWeeklyPlanItems,
  isScheduledWeeklyPlanItem,
  MAX_WEEKLY_PLAN_ITEM_TITLE_LENGTH,
  normalizeWeeklyPlanItemTitle,
  type WeeklyPlanItem,
} from '@/lib/weekly-plan-item';
import {
  getCheckboxVisualState,
  getExecutionRecord,
  type CheckboxVisualState,
  type StudyPlanTodo,
} from '@/lib/study-plan-todo';

export type WeeklyPlanItemRowKind = 'editable' | 'scheduled_pending' | CheckboxVisualState;

const WEEKLY_PLAN_ITEM_ROW_SURFACE_CLASSES: Record<WeeklyPlanItemRowKind, string> = {
  editable: 'border-gray-200 bg-gray-50 dark:border-neutral-700 dark:bg-zinc-800/80',
  scheduled_pending:
    'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30',
  pending: 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30',
  completed: 'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30',
  incomplete: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30',
  partial: 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30',
};

export function getWeeklyPlanItemRowSurfaceClasses(kind: WeeklyPlanItemRowKind): string {
  return WEEKLY_PLAN_ITEM_ROW_SURFACE_CLASSES[kind];
}

export function resolveWeeklyPlanItemRowKind(
  item: WeeklyPlanItem,
  todoById: ReadonlyMap<number, StudyPlanTodo>
): WeeklyPlanItemRowKind {
  if (!isScheduledWeeklyPlanItem(item)) {
    return 'editable';
  }

  const todo = todoById.get(Number(item.scheduledTodoId));
  if (!todo) {
    return 'scheduled_pending';
  }

  const execution =
    (todo.date ? getExecutionRecord(todo, todo.date) : undefined) ??
    (todo.recurrenceType === 'once'
      ? Object.values(todo.executionRecords)[0]
      : undefined);
  const status = getCheckboxVisualState(execution);

  if (status === 'pending') {
    return 'scheduled_pending';
  }

  return status;
}

export function partitionWeeklyPlanItems(items: WeeklyPlanItem[]): {
  allItems: WeeklyPlanItem[];
  unscheduledItems: WeeklyPlanItem[];
} {
  return {
    allItems: items,
    unscheduledItems: getUnscheduledWeeklyPlanItems(items),
  };
}

export function removeUnscheduledWeeklyPlanItem(
  allItems: WeeklyPlanItem[],
  itemId: string
): WeeklyPlanItem[] {
  return allItems.filter((item) => item.id !== itemId || isScheduledWeeklyPlanItem(item));
}

export function updateUnscheduledWeeklyPlanItemTitle(
  allItems: WeeklyPlanItem[],
  itemId: string,
  title: string
): { items: WeeklyPlanItem[] } | { error: string } {
  const target = allItems.find((item) => item.id === itemId);

  if (!target || isScheduledWeeklyPlanItem(target)) {
    return { error: '수정할 수 없는 항목입니다.' };
  }

  const normalized = normalizeWeeklyPlanItemTitle(title);

  if (normalized === null) {
    return {
      error: `항목은 ${MAX_WEEKLY_PLAN_ITEM_TITLE_LENGTH}자 이하여야 합니다.`,
    };
  }

  if (!normalized) {
    return { error: '제목을 입력해 주세요.' };
  }

  if (target.title === normalized) {
    return { items: allItems };
  }

  return {
    items: allItems.map((item) =>
      item.id === itemId ? { ...item, title: normalized } : item
    ),
  };
}

export function reorderUnscheduledWeeklyPlanItems(
  allItems: WeeklyPlanItem[],
  fromUnscheduledIndex: number,
  toUnscheduledIndex: number
): WeeklyPlanItem[] {
  const unscheduled = getUnscheduledWeeklyPlanItems(allItems);

  if (
    fromUnscheduledIndex === toUnscheduledIndex ||
    fromUnscheduledIndex < 0 ||
    toUnscheduledIndex < 0 ||
    fromUnscheduledIndex >= unscheduled.length ||
    toUnscheduledIndex >= unscheduled.length
  ) {
    return allItems;
  }

  const nextUnscheduled = [...unscheduled];
  const [moved] = nextUnscheduled.splice(fromUnscheduledIndex, 1);
  nextUnscheduled.splice(toUnscheduledIndex, 0, moved);

  let unscheduledIndex = 0;

  return allItems.map((item) => {
    if (isScheduledWeeklyPlanItem(item)) {
      return item;
    }

    const nextItem = nextUnscheduled[unscheduledIndex];
    unscheduledIndex += 1;
    return nextItem;
  });
}

export function buildTodoByIdMap(todos: StudyPlanTodo[]): ReadonlyMap<number, StudyPlanTodo> {
  return new Map(todos.map((todo) => [Number(todo.id), todo]));
}
