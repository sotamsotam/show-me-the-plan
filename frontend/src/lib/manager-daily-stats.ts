import {
  calculateExecutedStudyMinutes,
  calculatePlannedStudyMinutes,
  countExecutedTodos,
  durationBetweenIso,
  durationBetweenTimes,
  formatDurationMinutes,
  isExecutedOnTimeline,
} from '@/lib/day-timeline';
import {
  filterEventsByDate,
  getExecutionRecord,
  getSubjectLabel,
  type ExecutionStatus,
  type ExpandedStudyPlanTodoEvent,
  type StudyPlanExecutionRecord,
  type PlanSubjectKey,
  type StudyPlanTodo,
} from '@/lib/study-plan-todo';
import type { ProfileSubjectsInput } from '@/lib/user-subject';

export type TodoDetailBadgeStatus = ExecutionStatus | 'pending';

export interface StudentDailyTodoStats {
  totalTodos: number;
  executedTodos: number;
  countRate: number | null;
  timeRate: number | null;
}

export interface StudentDailyTodoDetailItem {
  id: string;
  todoId: number;
  subject: PlanSubjectKey;
  title: string;
  badgeStatus: TodoDetailBadgeStatus;
  badgeLabel: string;
  plannedMinutes: number;
  executedMinutes: number;
  timeRate: number | null;
  plannedTimeLabel: string;
  executedTimeLabel: string;
}

export interface StudentDailyTodoSubjectGroup {
  subject: PlanSubjectKey;
  subjectLabel: string;
  items: StudentDailyTodoDetailItem[];
}

export interface StudentDailyTodoData {
  stats: StudentDailyTodoStats;
  subjectGroups: StudentDailyTodoSubjectGroup[];
}

const DETAIL_BADGE_LABELS: Record<TodoDetailBadgeStatus, string> = {
  pending: '미실행',
  completed: '실행',
  partial: '부분실행',
  incomplete: '미완료',
};

function formatIsoTimeRange(start: string, end: string): string {
  return `${start.slice(11, 16)}~${end.slice(11, 16)}`;
}

export function getTodoDetailBadgeStatus(
  execution?: StudyPlanExecutionRecord
): TodoDetailBadgeStatus {
  return execution?.status ?? 'pending';
}

export function getTodoDetailBadgeLabel(status: TodoDetailBadgeStatus): string {
  return DETAIL_BADGE_LABELS[status];
}

function computeItemExecutedMinutes(
  execution: StudyPlanExecutionRecord | undefined
): number {
  if (!isExecutedOnTimeline(execution)) {
    return 0;
  }

  return Math.max(
    0,
    durationBetweenTimes(execution.executedStartTime, execution.executedEndTime)
  );
}

export function buildStudentDailyTodoDetails(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  date: string
): StudentDailyTodoDetailItem[] {
  return filterEventsByDate(events, date).map((event) => {
    const execution = getExecutionRecord(todosById.get(event.todoId), event.date);
    const badgeStatus = getTodoDetailBadgeStatus(execution);
    const plannedMinutes = Math.max(0, durationBetweenIso(event.start, event.end));
    const executedMinutes = computeItemExecutedMinutes(execution);

    const timeRate =
      plannedMinutes === 0
        ? null
        : Math.round((executedMinutes / plannedMinutes) * 100);

    const executedTimeLabel =
      isExecutedOnTimeline(execution)
        ? `${execution.executedStartTime}~${execution.executedEndTime}`
        : '-';

    return {
      id: event.id,
      todoId: event.todoId,
      subject: event.subject,
      title: event.title,
      badgeStatus,
      badgeLabel: getTodoDetailBadgeLabel(badgeStatus),
      plannedMinutes,
      executedMinutes,
      timeRate,
      plannedTimeLabel: formatIsoTimeRange(event.start, event.end),
      executedTimeLabel,
    };
  });
}

export function groupTodoDetailsBySubject(
  items: StudentDailyTodoDetailItem[],
  subjects?: ProfileSubjectsInput
): StudentDailyTodoSubjectGroup[] {
  const groups = new Map<PlanSubjectKey, StudentDailyTodoDetailItem[]>();

  for (const item of items) {
    const existing = groups.get(item.subject) ?? [];
    existing.push(item);
    groups.set(item.subject, existing);
  }

  return Array.from(groups.entries()).map(([subject, groupItems]) => ({
    subject,
    subjectLabel: getSubjectLabel(subject, subjects),
    items: groupItems,
  }));
}

export function buildStudentDailyTodoData(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  date: string,
  subjects?: ProfileSubjectsInput
): StudentDailyTodoData {
  const details = buildStudentDailyTodoDetails(events, todosById, date);

  return {
    stats: computeStudentDailyTodoStats(events, todosById, date),
    subjectGroups: groupTodoDetailsBySubject(details, subjects),
  };
}

export function computeStudentDailyTodoStats(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  date: string
): StudentDailyTodoStats {
  const dayTodos = filterEventsByDate(events, date);
  const totalTodos = dayTodos.length;
  const executedTodos = countExecutedTodos(events, date, todosById);

  const countRate =
    totalTodos === 0 ? null : Math.round((executedTodos / totalTodos) * 100);

  const plannedMinutes = calculatePlannedStudyMinutes(events, date);
  const executedMinutes = calculateExecutedStudyMinutes(events, date, todosById);

  const timeRate =
    plannedMinutes === 0
      ? null
      : Math.round((executedMinutes / plannedMinutes) * 100);

  return {
    totalTodos,
    executedTodos,
    countRate,
    timeRate,
  };
}

export { formatRatePercent } from '@/lib/rate-bar';

export function formatDetailDuration(minutes: number): string {
  return formatDurationMinutes(minutes);
}

export const TODO_DETAIL_BADGE_STYLES: Record<TodoDetailBadgeStatus, string> = {
  pending:
    'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300',
  completed:
    'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  partial:
    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  incomplete:
    'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

export function buildTodosById(todos: StudyPlanTodo[]): Map<number, StudyPlanTodo> {
  return new Map(todos.map((todo) => [todo.id, todo]));
}
