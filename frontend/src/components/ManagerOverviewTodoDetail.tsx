'use client';

import ExecutionRateBar from '@/components/ExecutionRateBar';
import ExecutionStatusCheckbox from '@/components/ExecutionStatusCheckbox';
import {
  formatDetailDuration,
  TODO_DETAIL_BADGE_STYLES,
  type StudentDailyTodoSubjectGroup,
} from '@/lib/manager-daily-stats';
import { formatOccurrenceDateLabel } from '@/lib/user-schedule';
import type { ManagedStudent } from '@/lib/manager-student';

interface ManagerOverviewTodoDetailProps {
  student: ManagedStudent;
  date: string;
  subjectGroups: StudentDailyTodoSubjectGroup[];
  inline?: boolean;
}

export default function ManagerOverviewTodoDetail({
  student,
  date,
  subjectGroups,
  inline = false,
}: ManagerOverviewTodoDetailProps) {
  const totalItems = subjectGroups.reduce(
    (count, group) => count + group.items.length,
    0
  );

  return (
    <div
      className={
        inline
          ? 'border-t border-blue-100 bg-gray-50 px-4 py-5 dark:border-blue-900/40 dark:bg-zinc-900/50 md:px-6'
          : 'border-t border-gray-200 bg-gray-50 px-4 py-5 dark:border-neutral-800 dark:bg-zinc-900/50 md:px-6'
      }
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {student.username} · {formatOccurrenceDateLabel(date)} TODO 상세
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          과목별 계획·실행 시간과 실행률을 확인할 수 있습니다.
        </p>
      </div>

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
  );
}
