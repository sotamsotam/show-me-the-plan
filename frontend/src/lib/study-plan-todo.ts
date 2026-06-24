import type { EventInput } from '@fullcalendar/core';
import { resolveStudyDayDateFromIso } from '@/lib/schedule-time';
import type { RecurrenceType } from '@/lib/user-schedule';
import { subjectClassName } from '@/lib/calendar-design-tokens';
import {
  getSubjectLabel,
  getSubjectOptions,
  LEGACY_STUDY_PLAN_SUBJECTS,
  LEGACY_SUBJECT_LABELS,
  type LegacyStudyPlanSubject,
  type PlanSubjectKey,
  type ProfileSubjectsInput,
} from '@/lib/user-subject';

export type { RecurrenceType };

/** @deprecated LegacyStudyPlanSubject와 동일. 하위 호환용 별칭 */
export type StudyPlanSubject = LegacyStudyPlanSubject;

export type {
  LegacyStudyPlanSubject,
  PlanSubjectKey,
  ProfileSubjectsInput,
  SubjectOption,
  UserSubject,
} from '@/lib/user-subject';

export {
  buildSubjectSelectOptions,
  getSubjectLabel,
  getSubjectOptions,
  resolveProfileSubjects,
} from '@/lib/user-subject';

export const SUBJECT_OPTIONS = LEGACY_STUDY_PLAN_SUBJECTS.map((value) => ({
  value,
  label: LEGACY_SUBJECT_LABELS[value],
}));

export interface StudyPlanOccurrenceOverride {
  title: string;
  startTime: string;
  endTime: string;
}

export type ExecutionStatus = 'completed' | 'incomplete' | 'partial';
export type ExecutionInputMode = 'direct' | 'timer';
export type CheckboxVisualState = 'pending' | ExecutionStatus;

export interface StudyPlanExecutionRecord {
  status: ExecutionStatus;
  executedStartTime?: string;
  executedEndTime?: string;
  inputMode?: ExecutionInputMode;
  achievementLevel?: number;
}

export interface ExecutionRecordInput {
  status: ExecutionStatus;
  executedStartTime?: string;
  executedEndTime?: string;
  inputMode?: ExecutionInputMode;
  achievementLevel?: number;
}

export const EXECUTION_STATUS_OPTIONS = [
  { value: 'completed' as const, label: '실행완료' },
  { value: 'incomplete' as const, label: '미완료' },
  { value: 'partial' as const, label: '부분완료' },
] as const;

export const ACHIEVEMENT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export interface StudyPlanTodo {
  id: number;
  subject: PlanSubjectKey;
  title: string;
  startTime: string;
  endTime: string;
  recurrenceType: RecurrenceType;
  daysOfWeek: number[];
  validFrom: string | null;
  validUntil: string | null;
  date: string | null;
  excludedDates: string[];
  overrides: Record<string, StudyPlanOccurrenceOverride>;
  executionRecords: Record<string, StudyPlanExecutionRecord>;
}

export interface ExpandedStudyPlanTodoEvent {
  id: string;
  todoId: number;
  subject: PlanSubjectKey;
  title: string;
  start: string;
  end: string;
  date: string;
  recurrenceType: RecurrenceType;
  hasOverride: boolean;
}

export interface StudyPlanTodoInput {
  subject: PlanSubjectKey;
  title: string;
  startTime: string;
  endTime: string;
  recurrenceType: RecurrenceType;
  daysOfWeek?: number[];
  validFrom?: string;
  validUntil?: string;
  date?: string;
  excludedDates?: string[];
  overrides?: Record<string, StudyPlanOccurrenceOverride>;
}

export interface OccurrenceOverrideInput {
  title: string;
  startTime: string;
  endTime: string;
}

export function formatStudyPlanEventTitle(
  subject: PlanSubjectKey,
  title: string,
  subjects?: ProfileSubjectsInput
): string {
  return `[${getSubjectLabel(subject, subjects)}] ${title}`;
}

export function expandedEventsToCalendarEvents(
  events: ExpandedStudyPlanTodoEvent[],
  subjects?: ProfileSubjectsInput
): EventInput[] {
  return events.map((event) => {
    return {
      id: event.id,
      title: formatStudyPlanEventTitle(event.subject, event.title, subjects),
      start: event.start,
      end: event.end,
      editable: false,
      classNames: [
        'study-plan-event',
        'cal-event-card',
        subjectClassName(event.subject, subjects),
      ],
      extendedProps: {
        type: 'study-plan',
        todoId: event.todoId,
        subject: event.subject,
        title: event.title,
        recurrenceType: event.recurrenceType,
        date: event.date,
        hasOverride: event.hasOverride,
      },
    };
  });
}

export function filterEventsByDate(
  events: ExpandedStudyPlanTodoEvent[],
  date: string
): ExpandedStudyPlanTodoEvent[] {
  return events
    .filter((event) => resolveStudyDayDateFromIso(event.start) === date)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function filterCalendarEventsByDate(events: EventInput[], date: string): EventInput[] {
  return events
    .filter((event) => resolveStudyDayDateFromIso(String(event.start)) === date)
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));
}

export function getExecutionRecord(
  todo: StudyPlanTodo | undefined,
  date: string
): StudyPlanExecutionRecord | undefined {
  return todo?.executionRecords?.[date];
}

export function getCheckboxVisualState(
  execution?: StudyPlanExecutionRecord
): CheckboxVisualState {
  return execution?.status ?? 'pending';
}

export function getExecutionStatusLabel(status: ExecutionStatus): string {
  const option = EXECUTION_STATUS_OPTIONS.find((item) => item.value === status);
  return option?.label ?? status;
}

export function resolveOccurrenceFields(
  todo: StudyPlanTodo,
  date: string
): StudyPlanOccurrenceOverride {
  const override = todo.overrides[date];

  if (override) {
    return override;
  }

  return {
    title: todo.title,
    startTime: todo.startTime,
    endTime: todo.endTime,
  };
}
