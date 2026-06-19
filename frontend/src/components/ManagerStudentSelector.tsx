'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  formatManagedStudentLabel,
  isManagerStudentRequiredPath,
  MANAGER_STUDENT_NAV_ITEMS,
} from '@/lib/manager-student';
import { useManagerStudent } from '@/contexts/ManagerStudentContext';

function navLinkClass(active: boolean) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-100'
  }`;
}

export default function ManagerStudentSelector() {
  const pathname = usePathname();
  const {
    isManagerMode,
    students,
    selectedStudentId,
    loading,
    setSelectedStudentId,
  } = useManagerStudent();

  if (!isManagerMode || !isManagerStudentRequiredPath(pathname)) {
    return null;
  }

  function isActive(href: string, exact: boolean) {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-neutral-800 dark:bg-zinc-900/50 md:px-[50px]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        {students.length > 0 && (
          <label className="flex w-full min-w-[240px] shrink-0 flex-col gap-1 sm:w-auto">
            <span className="sr-only">담당 학생 선택</span>
            <select
              value={selectedStudentId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedStudentId(value ? Number(value) : null);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
            >
              <option value="">학생 선택</option>
              {students.map((student) => (
                <option key={student.userId} value={student.userId}>
                  {formatManagedStudentLabel(student)}
                </option>
              ))}
            </select>
          </label>
        )}

        {loading && (
          <p className="text-sm text-gray-500">학생 목록을 불러오는 중...</p>
        )}

        {!loading && students.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            아직 담당 학생이 없습니다. 학생이 내정보 수정에서 담당 매니저로 추가하면
            여기에 표시됩니다.
          </p>
        )}

        {!loading && selectedStudentId && (
          <nav
            className="flex flex-wrap items-center gap-1"
            aria-label="선택된 학생 관리 메뉴"
          >
            {MANAGER_STUDENT_NAV_ITEMS.map(({ href, label, exact }) => (
              <Link
                key={href}
                href={href}
                className={navLinkClass(isActive(href, exact))}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
