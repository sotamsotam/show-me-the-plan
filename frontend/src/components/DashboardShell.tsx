'use client';

import { type ReactNode, useEffect, useState } from 'react';
import ManagerStudentGuard from '@/components/ManagerStudentGuard';
import ManagerStudentSelector from '@/components/ManagerStudentSelector';
import { ManagerStudentProvider } from '@/contexts/ManagerStudentContext';
import { ProfileSubjectsProvider } from '@/contexts/ProfileSubjectsContext';
import type { ManagedStudent } from '@/lib/manager-student';
import { isApprovedManager, type AccountInfo } from '@/types/school';

interface DashboardShellProps {
  children: ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const [isManagerMode, setIsManagerMode] = useState(false);
  const [initialStudents, setInitialStudents] = useState<ManagedStudent[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadManagerContext() {
      try {
        const [profileRes, studentsRes] = await Promise.all([
          fetch('/api/profile/me', { credentials: 'include' }),
          fetch('/api/profile/manager/students', { credentials: 'include' }),
        ]);

        const profileData = await profileRes.json();
        const studentsData = await studentsRes.json();

        if (cancelled) {
          return;
        }

        const account: AccountInfo = {
          user: profileData.user ?? null,
          role: profileData.role ?? null,
          profile: profileData.profile ?? null,
        };

        const approved = isApprovedManager(account);
        setIsManagerMode(approved);

        if (approved && studentsRes.ok) {
          setInitialStudents(studentsData.students ?? []);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    loadManagerContext();

    return () => {
      cancelled = true;
    };
  }, []);

  const shellContent = !ready ? (
    children
  ) : (
    <ManagerStudentProvider
      isManagerMode={isManagerMode}
      initialStudents={initialStudents}
    >
      <ProfileSubjectsProvider>
        <ManagerStudentSelector />
        <ManagerStudentGuard>{children}</ManagerStudentGuard>
      </ProfileSubjectsProvider>
    </ManagerStudentProvider>
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      {shellContent}
    </div>
  );
}
