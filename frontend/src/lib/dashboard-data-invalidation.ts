import { invalidateCachedStudyPlanTodos } from '@/lib/cached-study-plan-todos';
import { invalidateCachedUserSchedules } from '@/lib/cached-user-schedules';

export function invalidateUserSchedules(studentUserId: number | null): void {
  invalidateCachedUserSchedules(studentUserId);
}

export function invalidateStudyPlanTodos(studentUserId: number | null): void {
  invalidateCachedStudyPlanTodos(studentUserId);
}

export function invalidateDashboardScheduleData(studentUserId: number | null): void {
  invalidateUserSchedules(studentUserId);
  invalidateStudyPlanTodos(studentUserId);
}
