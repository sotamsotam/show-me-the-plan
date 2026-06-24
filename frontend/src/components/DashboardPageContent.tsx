'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import ManagerOverviewDashboard from '@/components/ManagerOverviewDashboard';
import type { AccountInfo } from '@/types/school';
import { isApprovedManager, isPendingManager, isNeisStudent, isOtherStudent, SCHOOL_LEVEL_LABEL } from '@/types/school';

export default function DashboardPageContent() {
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
        <p className="text-sm text-gray-300">불러오는 중...</p>
      </main>
    );
  }

  const profile = account?.profile;
  const approvedManager = isApprovedManager(account);
  const pendingManager = isPendingManager(account);

  if (approvedManager) {
    return (
      <main className="w-full py-8 md:py-12">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-semibold text-white">학생별 공부현황</h1>
          <p className="text-sm text-gray-300">
            {session?.user?.username ?? account?.user?.username ?? '매니저'}님, 연결된
            학생들의 TODO 실행 현황을 확인할 수 있습니다.
          </p>
        </div>

        <ManagerOverviewDashboard />

        <div className="mt-6">
          <Link
            href="/dashboard/students"
            className="inline-flex items-center rounded-lg bg-[#1b76e0] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1668c7]"
          >
            학생별 관리
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex w-full flex-col items-center justify-center py-12">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-2xl font-semibold">대시보드</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          로그인된 사용자만 접근할 수 있는 페이지입니다.
        </p>

        {session?.user && (
          <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-4 text-sm dark:bg-zinc-800">
            <p>
              <span className="font-medium">사용자명:</span>{' '}
              {session.user.username}
            </p>
            <p>
              <span className="font-medium">이메일:</span> {session.user.email}
            </p>
          </div>
        )}

        {pendingManager && (
          <div className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            매니저 승인 대기 중입니다. 승인 완료 후 이용할 수 있습니다.
          </div>
        )}

        {profile && isOtherStudent(profile.schoolLevel) && (
          <div className="mb-6 space-y-1 rounded-lg bg-blue-50 p-4 text-sm dark:bg-blue-950">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              회원 구분
            </p>
            <p>
              <span className="font-medium">구분:</span>{' '}
              {SCHOOL_LEVEL_LABEL.other}
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              학교 시간표 연동 없이 과목과 일정을 직접 설정해 사용합니다.
            </p>
          </div>
        )}

        {profile && isNeisStudent(profile.schoolLevel) && (
          <div className="mb-6 space-y-1 rounded-lg bg-blue-50 p-4 text-sm dark:bg-blue-950">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              학교 정보
            </p>
            <p>
              <span className="font-medium">구분:</span>{' '}
              {SCHOOL_LEVEL_LABEL[profile.schoolLevel] ?? profile.schoolLevel}
            </p>
            <p>
              <span className="font-medium">학교:</span> {profile.schoolName}
            </p>
            <p>
              <span className="font-medium">학년/반:</span> {profile.grade}학년{' '}
              {profile.className}반
            </p>
          </div>
        )}

        <Link
          href="/"
          className="inline-block rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-zinc-800"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
