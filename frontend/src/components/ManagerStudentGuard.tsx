'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { isManagerStudentRequiredPath } from '@/lib/manager-student';
import { useManagerStudent } from '@/contexts/ManagerStudentContext';

interface ManagerStudentGuardProps {
  children: ReactNode;
}

export default function ManagerStudentGuard({ children }: ManagerStudentGuardProps) {
  const pathname = usePathname();
  const { isManagerMode, selectedStudentId, loading, students } = useManagerStudent();

  if (!isManagerMode || !isManagerStudentRequiredPath(pathname)) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-gray-500">
        불러오는 중...
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="mx-auto flex min-h-[240px] max-w-lg flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-neutral-700">
        <h2 className="mb-2 text-lg font-medium">담당 학생이 없습니다</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          학생이 내정보 수정에서 매니저로 설정하면 이 페이지를 이용할 수 있습니다.
        </p>
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-zinc-800"
        >
          학생별 공부현황으로 이동
        </Link>
      </div>
    );
  }

  if (!selectedStudentId) {
    return (
      <div className="mx-auto flex min-h-[240px] max-w-lg flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-neutral-700">
        <h2 className="mb-2 text-lg font-medium">학생을 선택해 주세요</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          상단의 담당 학생 선택 메뉴에서 관리할 학생을 선택하면 이 페이지를 이용할 수
          있습니다.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
