'use client';

import { ChevronRightIcon } from '@/components/ChevronRightIcon';
import ExecutionStatusCheckbox, {
  getCheckboxVisualState,
} from '@/components/ExecutionStatusCheckbox';
import SwipeableListRow from '@/components/SwipeableListRow';
import { TodoListSkeleton } from '@/components/skeletons/MobileSkeletons';
import { useProfileSubjectsContext } from '@/contexts/ProfileSubjectsContext';
import { countExecutedTodos } from '@/lib/day-timeline';
import {
  filterEventsByDate,
  getExecutionRecord,
  getExecutionStatusLabel,
  getSubjectLabel,
  type ExecutionStatus,
  type ExpandedStudyPlanTodoEvent,
  type StudyPlanTodo,
} from '@/lib/study-plan-todo';
import { resolveSubjectCategory, type LegacyStudyPlanSubject } from '@/lib/user-subject';
import ExamCountdownBadge from '@/components/calendar/ExamCountdownBadge';
import type { ExamCountdownResult } from '@/lib/exam-countdown';
import {
  formatOccurrenceDateLabel,
  getTodayIsoDate,
  shiftIsoDate,
} from '@/lib/user-schedule';

interface StudyPlanTodoListProps {
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  events: ExpandedStudyPlanTodoEvent[];
  todosById?: Map<number, StudyPlanTodo>;
  examCountdown?: ExamCountdownResult | null;
  loading?: boolean;
  onTodoClick?: (todo: ExpandedStudyPlanTodoEvent) => void;
  onAddClick?: () => void;
}

const STATUS_BADGE_STYLES: Record<ExecutionStatus, string> = {
  completed:
    'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  partial:
    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  incomplete:
    'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

function formatTimeRange(start: string, end: string): string {
  return `${start.slice(11, 16)}~${end.slice(11, 16)}`;
}

const SUBJECT_ACCENT_COLORS: Record<LegacyStudyPlanSubject, string> = {
  korean: 'bg-red-500',
  english: 'bg-blue-500',
  math: 'bg-violet-500',
  social: 'bg-amber-500',
  science: 'bg-cyan-500',
  ethics: 'bg-pink-500',
  tech_home: 'bg-lime-500',
  info: 'bg-sky-500',
  history: 'bg-yellow-600',
  chinese: 'bg-rose-600',
  other: 'bg-gray-500',
};

const SUBJECT_BADGE_MD_STYLES =
  'md:border md:bg-white md:shadow-sm dark:md:bg-zinc-900 dark:md:shadow-sm';

const SUBJECT_BADGE_MD_BORDER_STYLES: Record<LegacyStudyPlanSubject, string> = {
  korean: 'md:border-red-200 dark:md:border-red-800/50',
  english: 'md:border-blue-200 dark:md:border-blue-800/50',
  math: 'md:border-violet-200 dark:md:border-violet-800/50',
  social: 'md:border-amber-200 dark:md:border-amber-800/50',
  science: 'md:border-cyan-200 dark:md:border-cyan-800/50',
  ethics: 'md:border-pink-200 dark:md:border-pink-800/50',
  tech_home: 'md:border-lime-200 dark:md:border-lime-800/50',
  info: 'md:border-sky-200 dark:md:border-sky-800/50',
  history: 'md:border-yellow-200 dark:md:border-yellow-800/50',
  chinese: 'md:border-rose-200 dark:md:border-rose-800/50',
  other: 'md:border-gray-300 dark:md:border-neutral-600',
};

const SUBJECT_BADGE_STYLES: Record<LegacyStudyPlanSubject, string> = {
  korean: `bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 ${SUBJECT_BADGE_MD_STYLES} ${SUBJECT_BADGE_MD_BORDER_STYLES.korean}`,
  english: `bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 ${SUBJECT_BADGE_MD_STYLES} ${SUBJECT_BADGE_MD_BORDER_STYLES.english}`,
  math: `bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 ${SUBJECT_BADGE_MD_STYLES} ${SUBJECT_BADGE_MD_BORDER_STYLES.math}`,
  social: `bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 ${SUBJECT_BADGE_MD_STYLES} ${SUBJECT_BADGE_MD_BORDER_STYLES.social}`,
  science: `bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 ${SUBJECT_BADGE_MD_STYLES} ${SUBJECT_BADGE_MD_BORDER_STYLES.science}`,
  ethics: `bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 ${SUBJECT_BADGE_MD_STYLES} ${SUBJECT_BADGE_MD_BORDER_STYLES.ethics}`,
  tech_home: `bg-lime-100 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300 ${SUBJECT_BADGE_MD_STYLES} ${SUBJECT_BADGE_MD_BORDER_STYLES.tech_home}`,
  info: `bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 ${SUBJECT_BADGE_MD_STYLES} ${SUBJECT_BADGE_MD_BORDER_STYLES.info}`,
  history: `bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300 ${SUBJECT_BADGE_MD_STYLES} ${SUBJECT_BADGE_MD_BORDER_STYLES.history}`,
  chinese: `bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 ${SUBJECT_BADGE_MD_STYLES} ${SUBJECT_BADGE_MD_BORDER_STYLES.chinese}`,
  other: `bg-gray-100 text-gray-700 dark:bg-zinc-800/70 dark:text-gray-300 ${SUBJECT_BADGE_MD_STYLES} ${SUBJECT_BADGE_MD_BORDER_STYLES.other}`,
};

const SUBJECT_ROW_STYLES: Record<LegacyStudyPlanSubject, string> = {
  korean:
    'md:border-red-200 md:bg-red-100 md:shadow-sm md:transition-colors md:hover:bg-red-200/80 dark:md:border-red-800/50 dark:md:bg-red-950/40 dark:md:hover:bg-red-950/55',
  english:
    'md:border-blue-200 md:bg-blue-100 md:shadow-sm md:transition-colors md:hover:bg-blue-200/80 dark:md:border-blue-800/50 dark:md:bg-blue-950/40 dark:md:hover:bg-blue-950/55',
  math:
    'md:border-violet-200 md:bg-violet-100 md:shadow-sm md:transition-colors md:hover:bg-violet-200/80 dark:md:border-violet-800/50 dark:md:bg-violet-950/40 dark:md:hover:bg-violet-950/55',
  social:
    'md:border-amber-200 md:bg-amber-100 md:shadow-sm md:transition-colors md:hover:bg-amber-200/80 dark:md:border-amber-800/50 dark:md:bg-amber-950/40 dark:md:hover:bg-amber-950/55',
  science:
    'md:border-cyan-200 md:bg-cyan-100 md:shadow-sm md:transition-colors md:hover:bg-cyan-200/80 dark:md:border-cyan-800/50 dark:md:bg-cyan-950/40 dark:md:hover:bg-cyan-950/55',
  ethics:
    'md:border-pink-200 md:bg-pink-100 md:shadow-sm md:transition-colors md:hover:bg-pink-200/80 dark:md:border-pink-800/50 dark:md:bg-pink-950/40 dark:md:hover:bg-pink-950/55',
  tech_home:
    'md:border-lime-200 md:bg-lime-100 md:shadow-sm md:transition-colors md:hover:bg-lime-200/80 dark:md:border-lime-800/50 dark:md:bg-lime-950/40 dark:md:hover:bg-lime-950/55',
  info:
    'md:border-sky-200 md:bg-sky-100 md:shadow-sm md:transition-colors md:hover:bg-sky-200/80 dark:md:border-sky-800/50 dark:md:bg-sky-950/40 dark:md:hover:bg-sky-950/55',
  history:
    'md:border-yellow-200 md:bg-yellow-100 md:shadow-sm md:transition-colors md:hover:bg-yellow-200/80 dark:md:border-yellow-800/50 dark:md:bg-yellow-950/40 dark:md:hover:bg-yellow-950/55',
  chinese:
    'md:border-rose-200 md:bg-rose-100 md:shadow-sm md:transition-colors md:hover:bg-rose-200/80 dark:md:border-rose-800/50 dark:md:bg-rose-950/40 dark:md:hover:bg-rose-950/55',
  other:
    'md:border-gray-300 md:bg-gray-100 md:shadow-sm md:transition-colors md:hover:bg-gray-200/80 dark:md:border-neutral-600 dark:md:bg-zinc-800/70 dark:md:hover:bg-zinc-800',
};

export default function StudyPlanTodoList({
  selectedDate,
  onSelectedDateChange,
  events,
  todosById,
  examCountdown = null,
  loading = false,
  onTodoClick,
  onAddClick,
}: StudyPlanTodoListProps) {
  const { subjects: profileSubjects } = useProfileSubjectsContext();
  const dayTodos = filterEventsByDate(events, selectedDate);
  const executedCount = countExecutedTodos(events, selectedDate, todosById ?? new Map());
  const isToday = selectedDate === getTodayIsoDate();

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-zinc-900 md:shadow-sm">
      <div className="border-b border-gray-200 p-4 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onSelectedDateChange(shiftIsoDate(selectedDate, -1))}
            aria-label="이전 날짜"
            className="touch-target touch-press flex shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-neutral-600 dark:text-gray-300 dark:hover:bg-zinc-800"
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
            <div className="flex flex-wrap items-center justify-center gap-2">
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {formatOccurrenceDateLabel(selectedDate)}
              </p>
              {examCountdown ? (
                <ExamCountdownBadge countdown={examCountdown} variant="day" />
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectedDateChange(shiftIsoDate(selectedDate, 1))}
            aria-label="다음 날짜"
            className="touch-target touch-press flex shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-neutral-600 dark:text-gray-300 dark:hover:bg-zinc-800"
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
            onClick={() => onSelectedDateChange(getTodayIsoDate())}
            className="touch-press mt-3 min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-neutral-600 dark:text-gray-300 dark:hover:bg-zinc-800"
          >
            오늘로 이동
          </button>
        )}
      </div>

      <div className="md:p-4">
        {loading ? (
          <TodoListSkeleton />
        ) : dayTodos.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500 md:px-0 dark:text-gray-400">
            이 날짜에 등록된 스터디 플랜이 없습니다.
          </p>
        ) : (
          <ul className="md:space-y-3">
            {dayTodos.map((todo, index) => {
              const execution = getExecutionRecord(
                todosById?.get(todo.todoId),
                todo.date
              );
              const checkboxStatus = getCheckboxVisualState(execution);
              const executionLabel = execution
                ? getExecutionStatusLabel(execution.status)
                : '대기';
              const subjectCategory = resolveSubjectCategory(
                todo.subject,
                profileSubjects
              );

              return (
                <li
                  key={todo.id}
                  className={`overflow-hidden ${SUBJECT_ROW_STYLES[subjectCategory]} ${
                    index > 0
                      ? 'border-t border-gray-200 dark:border-neutral-800 md:border-t-0'
                      : ''
                  } md:rounded-lg md:border`}
                >
                <SwipeableListRow
                  actionLabel="기록"
                  onAction={() => onTodoClick?.(todo)}
                  onTap={() => onTodoClick?.(todo)}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`${getSubjectLabel(todo.subject, profileSubjects)} ${todo.title} - ${executionLabel}`}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onTodoClick?.(todo);
                      }
                    }}
                    className="touch-press flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50 md:gap-3 md:p-3 md:active:bg-transparent dark:active:bg-zinc-800/60 dark:md:active:bg-transparent"
                  >
                    <span
                      className={`hidden h-10 w-1 shrink-0 rounded-full md:block ${SUBJECT_ACCENT_COLORS[subjectCategory]}`}
                      aria-hidden
                    />
                    <span
                      className={`h-10 w-1 shrink-0 rounded-full md:hidden ${SUBJECT_ACCENT_COLORS[subjectCategory]}`}
                      aria-hidden
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${SUBJECT_BADGE_STYLES[subjectCategory]}`}
                        >
                          {getSubjectLabel(todo.subject, profileSubjects)}
                        </span>
                        <p className="min-w-0 text-[15px] font-semibold leading-snug text-gray-900 dark:text-gray-100">
                          {todo.title}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        계획 {formatTimeRange(todo.start, todo.end)}
                      </p>
                      {execution?.executedStartTime && execution.executedEndTime && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          시행 {execution.executedStartTime}~{execution.executedEndTime}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <div className="flex flex-col items-end gap-1.5">
                        {execution && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_BADGE_STYLES[execution.status]}`}
                          >
                            {getExecutionStatusLabel(execution.status)}
                            {(execution.status === 'completed' ||
                              execution.status === 'partial') &&
                              execution.achievementLevel != null &&
                              ` ${execution.achievementLevel}/10`}
                          </span>
                        )}
                        <ExecutionStatusCheckbox status={checkboxStatus} />
                      </div>
                      <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-400 md:hidden" />
                    </div>
                  </div>
                </SwipeableListRow>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!loading && (dayTodos.length > 0 || onAddClick) && (
        <div className="border-t border-gray-200 px-4 py-3 dark:border-neutral-800 md:px-4">
          {dayTodos.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              총 {dayTodos.length}개 · 실행 {executedCount}개
            </p>
          )}
          {onAddClick && (
            <button
              type="button"
              onClick={onAddClick}
              className={`touch-press hidden w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 md:block dark:hover:bg-blue-500 ${
                dayTodos.length > 0 ? 'mt-3' : ''
              }`}
            >
              스터디 플랜 추가
            </button>
          )}
        </div>
      )}
    </div>
  );
}
