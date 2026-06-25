import type { StudyPlanTodoFormInitial } from '@/components/StudyPlanTodoForm';
import type { ExpandedStudyPlanTodoEvent } from '@/lib/study-plan-todo';

export function buildInitialFromExpandedEvent(
  event: ExpandedStudyPlanTodoEvent
): StudyPlanTodoFormInitial {
  return {
    startTime: event.start.slice(11, 16),
    endTime: event.end.slice(11, 16),
    date: event.date,
  };
}

export function shouldShowOccurrenceChooser(event: ExpandedStudyPlanTodoEvent): boolean {
  return event.recurrenceType === 'weekly' && !event.hasOverride;
}

export function resolveEditFormMode(
  event: ExpandedStudyPlanTodoEvent
): 'once' | 'occurrence' {
  if (event.recurrenceType === 'weekly' && event.hasOverride) {
    return 'occurrence';
  }

  return 'once';
}
