'use client';

import Link from 'next/link';
import {
  formatManagedStudentLabel,
  MANAGER_STUDENT_NAV_ITEMS,
  type ManagedStudent,
} from '@/lib/manager-student';
import StudentSubscriptionBadge from '@/components/StudentSubscriptionBadge';
import { SCHOOL_LEVEL_LABEL } from '@/types/school';
import { useManagerStudent } from '@/contexts/ManagerStudentContext';

const MANAGER_LINKS = MANAGER_STUDENT_NAV_ITEMS;

function formatSchoolInfo(student: ManagedStudent): string {
  if (student.schoolName && student.grade && student.className) {
    return `${student.schoolName} ${student.grade}학년 ${student.className}반`;
  }

  return SCHOOL_LEVEL_LABEL[student.schoolLevel] ?? student.schoolLevel;
}

function StudentActionButtons({
  isSelected,
  onSelect,
  isAccessAllowed,
}: {
  isSelected: boolean;
  onSelect: () => void;
  isAccessAllowed?: boolean;
}) {
  const canManage = isAccessAllowed !== false;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onSelect}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
          isSelected
            ? 'bg-blue-600 text-white'
            : 'border border-gray-300 hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-zinc-800'
        }`}
      >
        {isSelected ? '선택됨' : '선택'}
      </button>
      {canManage
        ? MANAGER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onSelect}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-zinc-800"
            >
              {link.label}
            </Link>
          ))
        : null}
    </div>
  );
}

export default function ManagerDashboard() {
  const { students, loading, selectedStudentId, setSelectedStudentId } =
    useManagerStudent();

  if (loading) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-neutral-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-lg font-semibold">연결된 학생 명단</h2>
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-zinc-900">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-neutral-800">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">연결된 학생 명단</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              내정보 수정에서 매니저로 설정한 학생이 여기에 표시됩니다.
            </p>
          </div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            총 {students.length}명
          </p>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">
          아직 연결된 학생이 없습니다. 학생이 내정보 수정에서 매니저로 설정하면 이
          목록에 표시됩니다.
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 md:hidden dark:divide-neutral-800">
            {students.map((student) => {
              const isSelected = selectedStudentId === student.userId;

              return (
                <div
                  key={student.userId}
                  className={
                    isSelected
                      ? 'bg-blue-50/60 px-4 py-4 dark:bg-blue-950/20'
                      : 'px-4 py-4'
                  }
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{student.username}</p>
                      <StudentSubscriptionBadge isAccessAllowed={student.isAccessAllowed} />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {formatSchoolInfo(student)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {student.email}
                    </p>
                  </div>
                  <div className="mt-3 border-t border-gray-100 pt-3 dark:border-neutral-800">
                    <StudentActionButtons
                      isSelected={isSelected}
                      onSelect={() => setSelectedStudentId(student.userId)}
                      isAccessAllowed={student.isAccessAllowed}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 dark:bg-zinc-800/50 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-3 font-medium">이름</th>
                  <th className="px-6 py-3 font-medium">이메일</th>
                  <th className="px-6 py-3 font-medium">학교 정보</th>
                  <th className="px-6 py-3 font-medium">구독</th>
                  <th className="px-6 py-3 font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {students.map((student) => {
                  const isSelected = selectedStudentId === student.userId;

                  return (
                    <tr
                      key={student.userId}
                      className={
                        isSelected
                          ? 'bg-blue-50/60 dark:bg-blue-950/20'
                          : 'hover:bg-gray-50 dark:hover:bg-zinc-800/40'
                      }
                    >
                      <td className="px-6 py-4 font-medium">{student.username}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {student.email}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {formatSchoolInfo(student)}
                      </td>
                      <td className="px-6 py-4">
                        <StudentSubscriptionBadge isAccessAllowed={student.isAccessAllowed} />
                      </td>
                      <td className="px-6 py-4">
                        <StudentActionButtons
                          isSelected={isSelected}
                          onSelect={() => setSelectedStudentId(student.userId)}
                          isAccessAllowed={student.isAccessAllowed}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {students.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-4 text-sm text-gray-500 dark:border-neutral-800 dark:text-gray-400">
          {selectedStudentId ? (
            <span>
              현재 선택:{' '}
              <strong className="text-gray-800 dark:text-gray-200">
                {formatManagedStudentLabel(
                  students.find((s) => s.userId === selectedStudentId) ?? students[0]
                )}
              </strong>
            </span>
          ) : (
            '학생을 선택하면 스케줄·스터디 플랜·TODO·공부통계를 관리할 수 있습니다.'
          )}
        </div>
      )}
    </section>
  );
}
