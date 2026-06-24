'use client';

import { useState } from 'react';
import ExecutionRateBar from '@/components/ExecutionRateBar';
import ExecutionStatusCheckbox from '@/components/ExecutionStatusCheckbox';
import TodoDayStampModal from '@/components/TodoDayStampModal';
import TodoDayStampVisual from '@/components/TodoDayStampVisual';
import {
  formatDetailDuration,
  TODO_DETAIL_BADGE_STYLES,
  type StudentDailyTodoSubjectGroup,
} from '@/lib/manager-daily-stats';
import { type ManagedStudent } from '@/lib/manager-student';
import { upsertTodoDayStamp, type TodoDayStamp } from '@/lib/todo-day-stamp';
import { formatOccurrenceDateLabel } from '@/lib/user-schedule';

interface ManagerOverviewTodoDetailProps {
  student: ManagedStudent;
  date: string;
  subjectGroups: StudentDailyTodoSubjectGroup[];
  stamp?: TodoDayStamp | null;
  inline?: boolean;
  onStampSaved?: (stamp: TodoDayStamp) => void;
}

export default function ManagerOverviewTodoDetail({
  student,
  date,
  subjectGroups,
  stamp = null,
  inline = false,
  onStampSaved,
}: ManagerOverviewTodoDetailProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const totalItems = subjectGroups.reduce(
    (count, group) => count + group.items.length,
    0
  );

  async function handleConfirmStamp(message: string) {
    setSaving(true);
    setError('');

    const result = await upsertTodoDayStamp({
      date,
      message,
      studentUserId: student.userId,
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      throw new Error(result.error);
    }

    onStampSaved?.(result.stamp);
    setModalOpen(false);
  }

  return (
    <>
      <div
        className={
          inline
            ? 'border-t border-blue-100 bg-gray-50 px-4 py-5 dark:border-blue-900/40 dark:bg-zinc-900/50 md:px-6'
            : 'border-t border-gray-200 bg-gray-50 px-4 py-5 dark:border-neutral-800 dark:bg-zinc-900/50 md:px-6'
        }
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {student.username} · {formatOccurrenceDateLabel(date)} TODO 상세
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              과목별 계획·실행 시간과 실행률을 확인할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError('');
              setModalOpen(true);
            }}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            확인도장
          </button>
        </div>

        {stamp ? (
          <div className="mb-4 flex items-center gap-4 rounded-lg border border-blue-100 bg-white p-4 dark:border-blue-900/40 dark:bg-zinc-900">
            <TodoDayStampVisual message={stamp.message} variant="preview" className="h-28 w-28" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                확인도장이 등록되어 있습니다.
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                문구: {stamp.message}
              </p>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {totalItems === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            이 날짜에 등록된 스터디 플랜이 없습니다.
          </p>
        ) : (
          <div className="space-y-5">
            {subjectGroups.map((group) => (
              <section key={group.subject}>
                <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {group.subjectLabel}
                </h4>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-gray-200 bg-white p-3 dark:border-neutral-700 dark:bg-zinc-900"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {item.title}
                          </p>
                          <dl className="mt-2 grid gap-1 text-xs text-gray-600 dark:text-gray-300 sm:grid-cols-3">
                            <div>
                              <dt className="text-gray-500 dark:text-gray-400">계획</dt>
                              <dd className="font-medium tabular-nums">
                                {formatDetailDuration(item.plannedMinutes)} (
                                {item.plannedTimeLabel})
                              </dd>
                            </div>
                            <div>
                              <dt className="text-gray-500 dark:text-gray-400">실행</dt>
                              <dd className="font-medium tabular-nums">
                                {item.executedMinutes > 0
                                  ? `${formatDetailDuration(item.executedMinutes)} (${item.executedTimeLabel})`
                                  : '-'}
                              </dd>
                            </div>
                            <div className="flex items-center gap-2">
                              <dt className="shrink-0 text-gray-500 dark:text-gray-400">
                                실행률
                              </dt>
                              <dd className="mb-0 min-w-0 flex-1">
                                <ExecutionRateBar
                                  rate={item.timeRate}
                                  className="mx-0 max-w-[300px]"
                                />
                              </dd>
                            </div>
                          </dl>
                        </div>
                        <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 self-stretch">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${TODO_DETAIL_BADGE_STYLES[item.badgeStatus]}`}
                          >
                            {item.badgeLabel}
                          </span>
                          <ExecutionStatusCheckbox status={item.badgeStatus} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <TodoDayStampModal
        open={modalOpen}
        date={date}
        initialMessage={stamp?.message}
        studentUserId={student.userId}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmStamp}
      />
    </>
  );
}
