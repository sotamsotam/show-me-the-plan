import {
  resolveVacationWeeklyPlans,
  type VacationPeriodPreviewItem,
  type VacationWeeklyPlans,
  type VacationWeeklyPlansContextResponse,
} from '@/lib/vacation-weekly-plan';
import type { UserSubject } from '@/lib/user-subject';

export interface VacationWeeklyPlansContext {
  plans: VacationWeeklyPlans;
  vacationPeriodPreview: VacationPeriodPreviewItem[];
  subjects: UserSubject[];
}

export function createEmptyVacationWeeklyPlansContext(): VacationWeeklyPlansContext {
  return {
    plans: {},
    vacationPeriodPreview: [],
    subjects: [],
  };
}

export function resolveVacationWeeklyPlansContext(
  data: VacationWeeklyPlansContextResponse
): VacationWeeklyPlansContext {
  return {
    plans: resolveVacationWeeklyPlans(data.vacationWeeklyPlans),
    vacationPeriodPreview: data.vacationPeriodPreview ?? [],
    subjects: data.subjects ?? [],
  };
}

export type FetchVacationWeeklyPlansContextResult =
  | { ok: true; context: VacationWeeklyPlansContext }
  | { ok: false; error?: string };

export async function fetchVacationWeeklyPlansContext(
  withStudent: (path: string) => string
): Promise<FetchVacationWeeklyPlansContextResult> {
  try {
    const res = await fetch(withStudent('/api/profile/vacation-weekly-plans'), {
      credentials: 'include',
      cache: 'no-store',
    });
    const data = (await res.json()) as VacationWeeklyPlansContextResponse & {
      error?: string;
    };

    if (!res.ok) {
      return { ok: false, error: data.error };
    }

    return {
      ok: true,
      context: resolveVacationWeeklyPlansContext(data),
    };
  } catch {
    return { ok: false };
  }
}
