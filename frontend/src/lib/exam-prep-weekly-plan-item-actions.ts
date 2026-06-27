import type { ExamRoundSlot } from '@/lib/exam-countdown';
import type { ExamPrepWeeklyPlanItemRef } from '@/lib/exam-prep-weekly-plan-unachieved';

export interface CarryOverExamPrepWeeklyPlanItemRequest
  extends ExamPrepWeeklyPlanItemRef {
  toWeek: number;
  studentUserId?: number;
}

export async function requestCarryOverExamPrepWeeklyPlanItem(
  withStudent: (path: string) => string,
  payload: CarryOverExamPrepWeeklyPlanItemRequest
): Promise<{ ok: true } | { ok: false; error?: string }> {
  try {
    const res = await fetch(withStudent('/api/profile/exam-prep-weekly-plan-items'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data.error as string | undefined };
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function requestDeleteExamPrepWeeklyPlanItem(
  withStudent: (path: string) => string,
  payload: ExamPrepWeeklyPlanItemRef & { studentUserId?: number }
): Promise<{ ok: true } | { ok: false; error?: string }> {
  try {
    const res = await fetch(withStudent('/api/profile/exam-prep-weekly-plan-items'), {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data.error as string | undefined };
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export function buildCarryOverPayload(
  roundSlot: ExamRoundSlot,
  weekNumber: number,
  subjectId: string,
  itemId: string,
  toWeek: number
): CarryOverExamPrepWeeklyPlanItemRequest {
  return {
    roundSlot,
    weekNumber,
    subjectId,
    itemId,
    toWeek,
  };
}
