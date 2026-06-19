'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import ManagerDashboard from '@/components/ManagerDashboard';
import type { AccountInfo } from '@/types/school';
import { isApprovedManager } from '@/types/school';

export default function ManagerStudentsPageContent() {
  const { data: session } = useSession();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const res = await fetch('/api/profile/me', { credentials: 'include' });
        const data = await res.json();

        if (!cancelled && res.ok) {
          setAccount({
            user: data.user ?? null,
            role: data.role ?? null,
            profile: data.profile ?? null,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="flex w-full items-center justify-center py-12">
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  if (!isApprovedManager(account)) {
    return (
      <main className="flex w-full items-center justify-center py-12">
        <p className="text-sm text-gray-500">접근 권한이 없습니다.</p>
      </main>
    );
  }

  return (
    <main className="w-full py-8 md:py-12">
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold">학생별 관리</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {session?.user?.username ?? account?.user?.username ?? '매니저'}님, 연결된
          학생을 확인하고 관리할 수 있습니다.
        </p>
      </div>

      <ManagerDashboard />

      <div className="mt-6">
        <Link
          href="/dashboard"
          className="inline-block rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-zinc-800"
        >
          학생별 공부현황으로
        </Link>
      </div>
    </main>
  );
}
