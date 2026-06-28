'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import ExecutionRateBar from '@/components/ExecutionRateBar';
import ManagerOverviewTodoDetail from '@/components/ManagerOverviewTodoDetail';
import {
  buildStudentDailyTodoData,
  buildTodosById,
  type StudentDailyTodoData,
} from '@/lib/manager-daily-stats';
import StudentSubscriptionBadge from '@/components/StudentSubscriptionBadge';
import {
  formatManagedStudentLabel,
  withStudentUserId,
  type ManagedStudent,
} from '@/lib/manager-student';
import { getStudyPlanTodosInRange } from '@/lib/cached-study-plan-todos';
import { toExclusiveApiRangeEnd } from '@/lib/study-stats';
import { fetchTodoDayStampsInRange, type TodoDayStamp } from '@/lib/todo-day-stamp';
import { findTodoDayStampForDate } from '@/lib/todo-day-stamp-helpers';
import {
  formatOccurrenceDateLabel,
  getTodayIsoDate,
  shiftIsoDate,
} from '@/lib/user-schedule';
import { SCHOOL_LEVEL_LABEL } from '@/types/school';
import { useManagerStudent } from '@/contexts/ManagerStudentContext';

interface StudentRowData extends StudentDailyTodoData {
  error?: string;
  stamp?: TodoDayStamp | null;
}

async function fetchStudentDailyData(
  studentUserId: number,
  date: string
): Promise<{ daily: StudentDailyTodoData; stamp: TodoDayStamp | null }> {
  const apiEnd = toExclusiveApiRangeEnd(date);

  const [todoData, stampResult] = await Promise.all([
    getStudyPlanTodosInRange(
      { start: date, end: apiEnd, studentUserId },
      (url) => withStudentUserId(url, studentUserId)
    ),
    fetchTodoDayStampsInRange({
      start: date,
      end: apiEnd,
      studentUserId,
    }),
  ]);

  const daily = buildStudentDailyTodoData(
    todoData.expandedEvents ?? [],
    buildTodosById(todoData.todos),
    date
  );
  const stamp = stampResult.ok
    ? findTodoDayStampForDate(stampResult.stamps, date) ?? null
    : null;

  return { daily, stamp };
}

function formatSchoolInfo(student: ManagedStudent): string {
  if (student.schoolName && student.grade && student.className) {
    return `${student.schoolName} ${student.grade}학년 ${student.className}반`;
  }

  return SCHOOL_LEVEL_LABEL[student.schoolLevel] ?? student.schoolLevel;
}

function DetailToggleButton({
  isDetailOpen,
  disabled = false,
  onClick,
}: {
  isDetailOpen: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={isDetailOpen}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
        disabled
          ? 'border border-gray-200 text-gray-400 dark:border-neutral-700'
          : isDetailOpen
            ? 'bg-blue-600 text-white'
            : 'border border-gray-300 hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-zinc-800'
      }`}
    >
      {isDetailOpen ? '닫기' : '선택'}
    </button>
  );
}

interface ManagerOverviewStudentRowProps {
  student: ManagedStudent;
  rowData?: StudentRowData;
  isDetailOpen: boolean;
  selectedDate: string;
  onToggleDetail: (userId: number) => void;
  onStampSaved: (userId: number, stamp: TodoDayStamp) => void;
}

function ManagerOverviewStudentMobileCard({
  student,
  rowData,
  isDetailOpen,
  selectedDate,
  onToggleDetail,
  onStampSaved,
}: ManagerOverviewStudentRowProps) {
  const stats = rowData?.stats;

  return (
    <article
      className={
        isDetailOpen
          ? 'bg-blue-50/60 px-4 py-4 dark:bg-blue-950/20 max-[360px]:px-3'
          : 'px-4 py-4 max-[360px]:px-3'
      }
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-gray-900 dark:text-gray-100">{student.username}</p>
          <StudentSubscriptionBadge isAccessAllowed={student.isAccessAllowed} compact />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatManagedStudentLabel(student)}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">{formatSchoolInfo(student)}</p>
      </div>

      {rowData?.error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{rowData.error}</p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">TODO</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {stats?.totalTodos ?? '-'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">실행</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {stats?.executedTodos ?? '-'}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="mb-1 text-xs text-gray-500 dark:text-gray-400">건수 실행률</dt>
            <dd>
              <ExecutionRateBar rate={stats?.countRate ?? null} className="mx-0 max-w-none" />
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="mb-1 text-xs text-gray-500 dark:text-gray-400">시간 실행률</dt>
            <dd>
              <ExecutionRateBar rate={stats?.timeRate ?? null} className="mx-0 max-w-none" />
            </dd>
          </div>
        </dl>
      )}

      <div className="mt-3 border-t border-gray-100 pt-3 dark:border-neutral-800">
        <DetailToggleButton
          isDetailOpen={isDetailOpen}
          disabled={Boolean(rowData?.error)}
          onClick={() => onToggleDetail(student.userId)}
        />
      </div>

      {isDetailOpen && rowData && !rowData.error ? (
        <div className="mt-4">
          <ManagerOverviewTodoDetail
            student={student}
            date={selectedDate}
            subjectGroups={rowData.subjectGroups}
            stamp={rowData.stamp ?? null}
            inline
            onStampSaved={(stamp) => onStampSaved(student.userId, stamp)}
          />
        </div>
      ) : null}
    </article>
  );
}

export default function ManagerOverviewDashboard() {
  const { students, loading: studentsLoading } = useManagerStudent();
  const [selectedDate, setSelectedDate] = useState(getTodayIsoDate);
  const [dataByUserId, setDataByUserId] = useState<Record<number, StudentRowData>>(
    {}
  );
  const [selectedDetailUserId, setSelectedDetailUserId] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const fetchIdRef = useRef(0);

  const loadDailyStats = useCallback(async (date: string, studentList: ManagedStudent[]) => {
    if (studentList.length === 0) {
      setDataByUserId({});
      setLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setLoading(true);

    const results = await Promise.all(
      studentList.map(async (student) => {
        try {
          const { daily, stamp } = await fetchStudentDailyData(student.userId, date);
          return {
            userId: student.userId,
            data: {
              ...daily,
              stamp,
            } satisfies StudentRowData,
          };
        } catch (error) {
          return {
            userId: student.userId,
            data: {
              stats: {
                totalTodos: 0,
                executedTodos: 0,
                countRate: null,
                timeRate: null,
              },
              subjectGroups: [],
              error:
                error instanceof Error
                  ? error.message
                  : 'TODO 데이터를 불러오지 못했습니다.',
            } satisfies StudentRowData,
          };
        }
      })
    );

    if (fetchId !== fetchIdRef.current) {
      return;
    }

    setDataByUserId(
      Object.fromEntries(results.map(({ userId, data }) => [userId, data]))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (studentsLoading) {
      return;
    }

    loadDailyStats(selectedDate, students);
  }, [selectedDate, students, studentsLoading, loadDailyStats]);

  useEffect(() => {
    if (
      selectedDetailUserId != null &&
      !students.some((student) => student.userId === selectedDetailUserId)
    ) {
      setSelectedDetailUserId(null);
    }
  }, [students, selectedDetailUserId]);

  function handleToggleDetail(userId: number) {
    setSelectedDetailUserId((current) => (current === userId ? null : userId));
  }

  function handleStampSaved(userId: number, stamp: TodoDayStamp) {
    setDataByUserId((current) => {
      const row = current[userId];

      if (!row) {
        return current;
      }

      return {
        ...current,
        [userId]: {
          ...row,
          stamp,
        },
      };
    });
  }

  const isToday = selectedDate === getTodayIsoDate();

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-zinc-900">
      <div className="border-b border-gray-200 p-4 dark:border-neutral-800 md:px-6 md:py-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedDate(shiftIsoDate(selectedDate, -1))}
            aria-label="이전 날짜"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 dark:border-neutral-600 dark:text-gray-300 dark:hover:bg-zinc-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <div className="min-w-0 flex-1 text-center">
            {isToday && (
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                오늘
              </p>
            )}
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 md:text-lg">
              {formatOccurrenceDateLabel(selectedDate)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(shiftIsoDate(selectedDate, 1))}
            aria-label="다음 날짜"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 dark:border-neutral-600 dark:text-gray-300 dark:hover:bg-zinc-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {!isToday && (
          <button
            type="button"
            onClick={() => setSelectedDate(getTodayIsoDate())}
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-neutral-600 dark:text-gray-300 dark:hover:bg-zinc-800"
          >
            오늘로 이동
          </button>
        )}
      </div>

      {studentsLoading || loading ? (
        <div className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">
          불러오는 중...
        </div>
      ) : students.length === 0 ? (
        <div className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">
          아직 연결된 학생이 없습니다. 학생이 내정보 수정에서 매니저로 설정하면
          여기에 표시됩니다.
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 md:hidden dark:divide-neutral-800">
            {students.map((student) => (
              <ManagerOverviewStudentMobileCard
                key={student.userId}
                student={student}
                rowData={dataByUserId[student.userId]}
                isDetailOpen={selectedDetailUserId === student.userId}
                selectedDate={selectedDate}
                onToggleDetail={handleToggleDetail}
                onStampSaved={handleStampSaved}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 dark:bg-zinc-800/50 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-3 font-medium">학생</th>
                  <th className="px-6 py-3 font-medium">학교 정보</th>
                  <th className="px-6 py-3 font-medium text-center">TODO</th>
                  <th className="px-6 py-3 font-medium text-center">실행</th>
                  <th className="min-w-[112px] px-4 py-3 font-medium text-center">건수 실행률</th>
                  <th className="min-w-[112px] px-4 py-3 font-medium text-center">시간 실행률</th>
                  <th className="px-6 py-3 font-medium text-center">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {students.map((student) => {
                  const rowData = dataByUserId[student.userId];
                  const stats = rowData?.stats;
                  const isDetailOpen = selectedDetailUserId === student.userId;

                  return (
                    <Fragment key={student.userId}>
                      <tr
                        className={
                          isDetailOpen
                            ? 'bg-blue-50/60 dark:bg-blue-950/20'
                            : 'hover:bg-gray-50 dark:hover:bg-zinc-800/40'
                        }
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {student.username}
                            </p>
                            <StudentSubscriptionBadge isAccessAllowed={student.isAccessAllowed} compact />
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {formatManagedStudentLabel(student)}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {formatSchoolInfo(student)}
                        </td>
                        {rowData?.error ? (
                          <>
                            <td
                              colSpan={4}
                              className="px-6 py-4 text-sm text-red-600 dark:text-red-400"
                            >
                              {rowData.error}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <DetailToggleButton isDetailOpen={isDetailOpen} disabled />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 text-center tabular-nums text-gray-900 dark:text-gray-100">
                              {stats?.totalTodos ?? '-'}
                            </td>
                            <td className="px-6 py-4 text-center tabular-nums text-gray-900 dark:text-gray-100">
                              {stats?.executedTodos ?? '-'}
                            </td>
                            <td className="px-4 py-4">
                              <ExecutionRateBar rate={stats?.countRate ?? null} />
                            </td>
                            <td className="px-4 py-4">
                              <ExecutionRateBar rate={stats?.timeRate ?? null} />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <DetailToggleButton
                                isDetailOpen={isDetailOpen}
                                onClick={() => handleToggleDetail(student.userId)}
                              />
                            </td>
                          </>
                        )}
                      </tr>

                      {isDetailOpen && rowData && !rowData.error && (
                        <tr className="bg-blue-50/40 dark:bg-blue-950/10">
                          <td colSpan={7} className="p-0">
                            <ManagerOverviewTodoDetail
                              student={student}
                              date={selectedDate}
                              subjectGroups={rowData.subjectGroups}
                              stamp={rowData.stamp ?? null}
                              inline
                              onStampSaved={(stamp) => handleStampSaved(student.userId, stamp)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
