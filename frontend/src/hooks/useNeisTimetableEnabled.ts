'use client';

import { useEffect, useState } from 'react';
import { useManagerStudent } from '@/contexts/ManagerStudentContext';
import { isNeisStudent } from '@/types/school';

export function useNeisTimetableEnabled() {
  const { isManagerMode, selectedStudent } = useManagerStudent();
  const [ownSchoolLevel, setOwnSchoolLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isManagerMode);

  useEffect(() => {
    if (isManagerMode) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch('/api/profile/me', { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!cancelled) {
          setOwnSchoolLevel(res.ok ? (data.profile?.schoolLevel ?? null) : null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOwnSchoolLevel(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isManagerMode]);

  const schoolLevel = isManagerMode
    ? (selectedStudent?.schoolLevel ?? null)
    : ownSchoolLevel;

  return {
    loading: isManagerMode ? false : loading,
    usesNeisTimetable: schoolLevel ? isNeisStudent(schoolLevel) : false,
  };
}
