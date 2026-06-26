'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { AccountInfo } from '@/types/school';
import { isApprovedManager } from '@/types/school';

interface ManagerGuideAccessGuardProps {
  children: ReactNode;
}

export default function ManagerGuideAccessGuard({
  children,
}: ManagerGuideAccessGuardProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      try {
        const res = await fetch('/api/profile/me', { credentials: 'include' });
        const data = await res.json();

        if (cancelled) {
          return;
        }

        const account: AccountInfo = {
          user: data.user ?? null,
          role: data.role ?? null,
          profile: data.profile ?? null,
        };

        if (!isApprovedManager(account)) {
          router.replace('/dashboard');
          return;
        }

        setAllowed(true);
      } catch {
        if (!cancelled) {
          router.replace('/dashboard');
        }
      }
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (allowed !== true) {
    return (
      <div className="flex w-full items-center justify-center py-12">
        <p className="text-sm text-gray-300">불러오는 중...</p>
      </div>
    );
  }

  return children;
}
