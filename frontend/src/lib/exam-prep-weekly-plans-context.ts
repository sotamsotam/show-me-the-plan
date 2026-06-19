import {
  resolveExamPrepWeeksByRound,
  type ExamPrepWeeksByRound,
  type ExamRoundPreviewItem,
} from '@/lib/exam-countdown';
import {
  resolveEffectiveExamRoundPreview,
  resolveExamPeriodSettings,
} from '@/lib/exam-period-settings';
import {
  createEmptyExamPrepWeeklyPlans,
  resolveExamPrepWeeklyPlans,
  type ExamPrepWeeklyPlans,
  type ExamPrepWeeklyPlansContextResponse,
} from '@/lib/exam-prep-weekly-plan';
import type { UserSubject } from '@/lib/user-subject';

export interface ExamPrepWeeklyPlansContext {
  plans: ExamPrepWeeklyPlans;
  examPrepWeeksByRound: ExamPrepWeeksByRound;
  examRoundPreview: ExamRoundPreviewItem[];
  subjects: UserSubject[];
}

export function createEmptyExamPrepWeeklyPlansContext(): ExamPrepWeeklyPlansContext {
  return {
    plans: createEmptyExamPrepWeeklyPlans(),
    examPrepWeeksByRound: resolveExamPrepWeeksByRound(null),
    examRoundPreview: [],
    subjects: [],
  };
}

export function resolveExamPrepWeeklyPlansContext(
  data: ExamPrepWeeklyPlansContextResponse
): ExamPrepWeeklyPlansContext {
  const examPeriodSettings = resolveExamPeriodSettings(data.examPeriodSettings);
  const examRoundPreview = resolveEffectiveExamRoundPreview(
    examPeriodSettings,
    data.examRoundPreview ?? []
  );

  return {
    plans: resolveExamPrepWeeklyPlans(data.examPrepWeeklyPlans),
    examPrepWeeksByRound: resolveExamPrepWeeksByRound(
      data.examPrepWeeksByRound,
      data.examPrepWeeksBefore
    ),
    examRoundPreview,
    subjects: data.subjects ?? [],
  };
}

export type FetchExamPrepWeeklyPlansContextResult =
  | { ok: true; context: ExamPrepWeeklyPlansContext }
  | { ok: false; error?: string };

export async function fetchExamPrepWeeklyPlansContext(
  withStudent: (path: string) => string
): Promise<FetchExamPrepWeeklyPlansContextResult> {
  try {
    const res = await fetch(withStudent('/api/profile/exam-prep-weekly-plans'), {
      credentials: 'include',
    });
    const data = (await res.json()) as ExamPrepWeeklyPlansContextResponse & {
      error?: string;
    };

    if (!res.ok) {
      return { ok: false, error: data.error };
    }

    return {
      ok: true,
      context: resolveExamPrepWeeklyPlansContext(data),
    };
  } catch {
    return { ok: false };
  }
}
