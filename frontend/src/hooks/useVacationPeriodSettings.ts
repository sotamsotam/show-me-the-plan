'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStudentApi } from '@/hooks/useStudentApi';
import {
  buildVacationPeriodPreviewFromSettings,
  createEmptyVacationPeriodSettings,
  resolveVacationPeriodSettings,
  settingsToVacationPeriods,
  type VacationPeriodSettings,
  type VacationPeriodSettingsResponse,
} from '@/lib/vacation-period-settings';
import type { VacationPeriod } from '@/lib/school-term-periods';

export function useVacationPeriodSettings() {
  const { withStudent, studentUserId } = useStudentApi();
  const [settings, setSettings] = useState<VacationPeriodSettings>(
    createEmptyVacationPeriodSettings()
  );
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(withStudent('/api/profile/vacation-period-settings'), {
        credentials: 'include',
      });
      const data = (await res.json()) as VacationPeriodSettingsResponse & {
        error?: string;
      };

      if (!res.ok) {
        setSettings(createEmptyVacationPeriodSettings());
        setVacationPeriods([]);
        setError(data.error ?? null);
        return;
      }

      const resolved = resolveVacationPeriodSettings(data.vacationPeriodSettings);
      setSettings(resolved);
      setVacationPeriods(settingsToVacationPeriods(resolved));
    } catch {
      setSettings(createEmptyVacationPeriodSettings());
      setVacationPeriods([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [withStudent]);

  useEffect(() => {
    refresh();
  }, [refresh, studentUserId]);

  return {
    settings,
    vacationPeriods,
    vacationPeriodPreview: buildVacationPeriodPreviewFromSettings(settings),
    loading,
    error,
    refresh,
  };
}
