import type { RegularPeriodSegmentPreviewItem } from '@/lib/regular-period-segments';
import {
  resolveRegularWeeklyPlans,
  type RegularWeeklyPlans,
  type RegularWeeklyPlansContextResponse,
} from '@/lib/regular-weekly-plan';
import type { UserSubject } from '@/lib/user-subject';

export interface RegularWeeklyPlansContext {
  plans: RegularWeeklyPlans;
  regularPeriodPreview: RegularPeriodSegmentPreviewItem[];
  subjects: UserSubject[];
}

export function createEmptyRegularWeeklyPlansContext(): RegularWeeklyPlansContext {
  return {
    plans: {},
    regularPeriodPreview: [],
    subjects: [],
  };
}

export function resolveRegularWeeklyPlansContext(
  data: RegularWeeklyPlansContextResponse
): RegularWeeklyPlansContext {
  return {
    plans: resolveRegularWeeklyPlans(data.regularWeeklyPlans),
    regularPeriodPreview: data.regularPeriodPreview ?? [],
    subjects: data.subjects ?? [],
  };
}

export type FetchRegularWeeklyPlansContextResult =
  | { ok: true; context: RegularWeeklyPlansContext }
  | { ok: false; error?: string };

export async function fetchRegularWeeklyPlansContext(
  withStudent: (path: string) => string
): Promise<FetchRegularWeeklyPlansContextResult> {
  try {
    const res = await fetch(withStudent('/api/profile/regular-weekly-plans'), {
      credentials: 'include',
      cache: 'no-store',
    });
    const data = (await res.json()) as RegularWeeklyPlansContextResponse & {
      error?: string;
    };

    if (!res.ok) {
      return { ok: false, error: data.error };
    }

    return {
      ok: true,
      context: resolveRegularWeeklyPlansContext(data),
    };
  } catch {
    return { ok: false };
  }
}
