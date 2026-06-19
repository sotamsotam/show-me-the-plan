import {
  durationBetweenIso,
  durationBetweenTimes,
  isExecutedOnTimeline,
} from '@/lib/day-timeline';
import {
  getCheckboxVisualState,
  getExecutionRecord,
  getSubjectLabel,
  type CheckboxVisualState,
  type ExpandedStudyPlanTodoEvent,
  type PlanSubjectKey,
  type StudyPlanTodo,
} from '@/lib/study-plan-todo';
import type { ProfileSubjectsInput } from '@/lib/user-subject';
import { LEGACY_STUDY_PLAN_SUBJECTS } from '@/lib/user-subject';

export interface StudyExecutionDetailRow {
  eventId: string;
  todoId: number;
  subject: PlanSubjectKey;
  title: string;
  executionDate: string;
  executionStatus: CheckboxVisualState;
  executionRate: number | null;
  achievementRate: number | null;
}

export interface StudyExecutionDetailSubjectGroup {
  subject: PlanSubjectKey;
  subjectLabel: string;
  rows: StudyExecutionDetailRow[];
}

export type StudyExecutionDetailSortKey = 'title' | 'achievementRate' | 'executionDate';
export type StudyExecutionDetailSortDirection = 'asc' | 'desc';

export const DEFAULT_STUDY_EXECUTION_DETAIL_SORT_KEY: StudyExecutionDetailSortKey =
  'title';
export const DEFAULT_STUDY_EXECUTION_DETAIL_SORT_DIRECTION: StudyExecutionDetailSortDirection =
  'asc';

const SUBJECT_ORDER = new Map(
  LEGACY_STUDY_PLAN_SUBJECTS.map((value, index) => [value, index])
);

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function normalizeTitle(value: string): string {
  return value.trim().normalize('NFC');
}

function compareTitle(a: StudyExecutionDetailRow, b: StudyExecutionDetailRow): number {
  return normalizeTitle(a.title).localeCompare(normalizeTitle(b.title), 'ko');
}

function compareExecutionDateAsc(a: StudyExecutionDetailRow, b: StudyExecutionDetailRow): number {
  return a.executionDate.localeCompare(b.executionDate);
}

function computeExecutedMinutes(
  execution: ReturnType<typeof getExecutionRecord>
): number {
  if (!isExecutedOnTimeline(execution)) {
    return 0;
  }

  return Math.max(
    0,
    durationBetweenTimes(execution.executedStartTime, execution.executedEndTime)
  );
}

function computeAchievementRate(
  execution: ReturnType<typeof getExecutionRecord>
): number | null {
  if (
    !execution ||
    execution.status === 'incomplete' ||
    execution.achievementLevel == null
  ) {
    return null;
  }

  return execution.achievementLevel * 10;
}

function compareNullableNumber(
  a: number | null,
  b: number | null,
  direction: StudyExecutionDetailSortDirection
): number {
  if (a === null && b === null) {
    return 0;
  }

  if (a === null) {
    return 1;
  }

  if (b === null) {
    return -1;
  }

  const diff = a - b;
  return direction === 'asc' ? diff : -diff;
}

function compareRows(
  a: StudyExecutionDetailRow,
  b: StudyExecutionDetailRow,
  sortKey: StudyExecutionDetailSortKey,
  direction: StudyExecutionDetailSortDirection
): number {
  if (sortKey === 'title') {
    const titleDiff = compareTitle(a, b);
    if (titleDiff !== 0) {
      return direction === 'asc' ? titleDiff : -titleDiff;
    }

    const dateDiff = compareExecutionDateAsc(a, b);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    if (a.todoId !== b.todoId) {
      return a.todoId - b.todoId;
    }

    return a.eventId.localeCompare(b.eventId);
  }

  let primaryDiff = 0;

  if (sortKey === 'achievementRate') {
    primaryDiff = compareNullableNumber(a.achievementRate, b.achievementRate, direction);
  } else {
    primaryDiff = compareExecutionDateAsc(a, b);
    primaryDiff = direction === 'asc' ? primaryDiff : -primaryDiff;
  }

  if (primaryDiff !== 0) {
    return primaryDiff;
  }

  const titleDiff = compareTitle(a, b);
  if (titleDiff !== 0) {
    return titleDiff;
  }

  if (sortKey !== 'executionDate') {
    const dateDiff = compareExecutionDateAsc(a, b);
    if (dateDiff !== 0) {
      return dateDiff;
    }
  }

  if (a.todoId !== b.todoId) {
    return a.todoId - b.todoId;
  }

  return a.eventId.localeCompare(b.eventId);
}

export function sortStudyExecutionDetailSubjectGroups(
  groups: StudyExecutionDetailSubjectGroup[],
  sortKey: StudyExecutionDetailSortKey,
  direction: StudyExecutionDetailSortDirection
): StudyExecutionDetailSubjectGroup[] {
  return groups.map((group) => ({
    ...group,
    rows: [...group.rows].sort((a, b) => compareRows(a, b, sortKey, direction)),
  }));
}

export function buildStudyExecutionDetailRows(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  rangeStart: string,
  rangeEnd: string
): StudyExecutionDetailRow[] {
  const rows = events
    .filter((event) => event.date >= rangeStart && event.date <= rangeEnd)
    .map((event) => {
      const todo = todosById.get(event.todoId);
      const execution = getExecutionRecord(todo, event.date);
      const plannedMinutes = Math.max(0, durationBetweenIso(event.start, event.end));
      const executedMinutes = computeExecutedMinutes(execution);

      const executionRate =
        plannedMinutes === 0
          ? null
          : Math.round((executedMinutes / plannedMinutes) * 100);

      return {
        eventId: event.id,
        todoId: event.todoId,
        subject: event.subject,
        title: event.title,
        executionDate: event.date,
        executionStatus: getCheckboxVisualState(execution),
        executionRate,
        achievementRate: computeAchievementRate(execution),
      };
    });

  return rows;
}

export function groupStudyExecutionDetailRows(
  rows: StudyExecutionDetailRow[],
  subjects?: ProfileSubjectsInput
): StudyExecutionDetailSubjectGroup[] {
  const groups = new Map<PlanSubjectKey, StudyExecutionDetailRow[]>();

  for (const row of rows) {
    const existing = groups.get(row.subject) ?? [];
    existing.push(row);
    groups.set(row.subject, existing);
  }

  return Array.from(groups.entries()).map(([subject, groupRows]) => ({
    subject,
    subjectLabel: getSubjectLabel(subject, subjects),
    rows: groupRows,
  }));
}

export function buildStudyExecutionDetailGroups(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  rangeStart: string,
  rangeEnd: string,
  subjects?: ProfileSubjectsInput
): StudyExecutionDetailSubjectGroup[] {
  return groupStudyExecutionDetailRows(
    buildStudyExecutionDetailRows(events, todosById, rangeStart, rangeEnd),
    subjects
  );
}

export function formatExecutionDateLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  const month = parsed.getMonth() + 1;
  const day = parsed.getDate();
  const weekday = WEEKDAY_LABELS[parsed.getDay()];
  return `${month}/${day} (${weekday})`;
}
