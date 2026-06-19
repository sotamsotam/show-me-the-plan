/** Calendar inline-edit session (once or single occurrence). Series edits use the form modal only. */
export type CalendarEditScope = 'once' | 'occurrence';

export interface CalendarEditSession {
  eventId: string;
  scheduleId: number;
  editScope: CalendarEditScope;
  /** Current occurrence date (updates after drag-move for weekly). */
  occurrenceDate: string;
}

export function buildUserEventId(scheduleId: number, date: string): string {
  return `user-${scheduleId}-${date}`;
}

export function buildOccurrenceKey(scheduleId: number, date: string): string {
  return `${scheduleId}:${date}`;
}

export function matchesCalendarEditSession(
  session: CalendarEditSession | null,
  eventId: string,
  scheduleId: number,
  occurrenceDate: string
): boolean {
  if (!session) {
    return false;
  }

  if (String(session.eventId) === String(eventId)) {
    return true;
  }

  return session.scheduleId === scheduleId && session.occurrenceDate === occurrenceDate;
}

/** Weekly instance edited as "this date only" — behaves like a once event in the calendar UI. */
export function isOccurrenceOnlyUserEvent(
  extendedProps: Record<string, unknown>,
  scheduleId: number,
  occurrenceDate: string,
  occurrenceOnlyKeys: ReadonlySet<string>
): boolean {
  if (extendedProps.type !== 'user' || extendedProps.recurrenceType !== 'weekly') {
    return false;
  }

  return (
    Boolean(extendedProps.hasOverride) ||
    occurrenceOnlyKeys.has(buildOccurrenceKey(scheduleId, occurrenceDate))
  );
}

export interface StudyPlanEditSession {
  eventId: string;
  todoId: number;
  editScope: CalendarEditScope;
  occurrenceDate: string;
}

export function buildStudyPlanEventId(todoId: number, date: string): string {
  return `study-plan-${todoId}-${date}`;
}

export function buildStudyPlanOccurrenceKey(todoId: number, date: string): string {
  return `study-plan:${todoId}:${date}`;
}

export function matchesStudyPlanEditSession(
  session: StudyPlanEditSession | null,
  eventId: string,
  todoId: number,
  occurrenceDate: string
): boolean {
  if (!session) {
    return false;
  }

  if (String(session.eventId) === String(eventId)) {
    return true;
  }

  return session.todoId === todoId && session.occurrenceDate === occurrenceDate;
}

export function isOccurrenceOnlyStudyPlanEvent(
  extendedProps: Record<string, unknown>,
  todoId: number,
  occurrenceDate: string,
  occurrenceOnlyKeys: ReadonlySet<string>
): boolean {
  if (extendedProps.type !== 'study-plan' || extendedProps.recurrenceType !== 'weekly') {
    return false;
  }

  return (
    Boolean(extendedProps.hasOverride) ||
    occurrenceOnlyKeys.has(buildStudyPlanOccurrenceKey(todoId, occurrenceDate))
  );
}
