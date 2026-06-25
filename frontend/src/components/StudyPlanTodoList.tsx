'use client';

import { useMemo, useState, type SVGProps } from 'react';
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
import { resolveSubjectCategory, type LegacyStudyPlanSubject, type UserSubject } from '@/lib/user-subject';
import {
  buildSubjectAccentBarStyle,
  buildSubjectBadgeStyle,
  buildSubjectRowStyle,
  hasExplicitSubjectColor,
} from '@/lib/subject-color';
import ExamCountdownBadge from '@/components/calendar/ExamCountdownBadge';
import TodoDayStampVisual from '@/components/TodoDayStampVisual';
import type { ExamCountdownResult } from '@/lib/exam-countdown';
import type { TodoDayStamp } from '@/lib/todo-day-stamp';
import {
  formatOccurrenceDateLabel,
  getTodayIsoDate,
  getWeekDatesContaining,
  shiftIsoDate,
  WEEKDAY_LABELS,
} from '@/lib/user-schedule';
import {
  groupConsecutiveTodosBySubject,
  readStudyPlanTodoListSortMode,
  sortExpandedEventsBySubjectOrder,
  writeStudyPlanTodoListSortMode,
  type StudyPlanTodoListSortMode,
} from '@/lib/study-plan-todo-list-sort';

interface StudyPlanTodoListProps {
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  events: ExpandedStudyPlanTodoEvent[];
  todosById?: Map<number, StudyPlanTodo>;
  dayStamp?: TodoDayStamp | null;
  examCountdown?: ExamCountdownResult | null;
  loading?: boolean;
  onTodoClick?: (todo: ExpandedStudyPlanTodoEvent) => void;
  onTodoEdit?: (todo: ExpandedStudyPlanTodoEvent) => void;
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

function SubjectSortIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <rect x="2.5" y="3" width="2.75" height="2.75" rx="0.6" />
      <rect x="2.5" y="8.125" width="2.75" height="2.75" rx="0.6" />
      <rect x="2.5" y="13.25" width="2.75" height="2.75" rx="0.6" />
      <path d="M7.25 4.375h10.25a.625.625 0 010 1.25H7.25a.625.625 0 010-1.25zM7.25 9.5h10.25a.625.625 0 010 1.25H7.25a.625.625 0 010-1.25zM7.25 14.625h10.25a.625.625 0 010 1.25H7.25a.625.625 0 010-1.25z" />
    </svg>
  );
}

function TimeSortIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.5a.75.75 0 00-1.5 0v4.5a.75.75 0 00.75.75h2.75a.75.75 0 000-1.5h-2.25V6.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const SORT_TOGGLE_BUTTON_CLASS =
  'touch-press mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/25 transition-[transform,background-color] active:scale-[0.97] hover:bg-blue-700 dark:shadow-black/30 dark:hover:bg-blue-500';

const SORT_TOGGLE_ICON_CLASS = 'h-3.5 w-3.5 shrink-0 text-white';

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

type AccentBarMode = 'individual' | 'grouped';

interface StudyPlanTodoListRowProps {
  todo: ExpandedStudyPlanTodoEvent;
  profileSubjects: UserSubject[];
  todosById?: Map<number, StudyPlanTodo>;
  onTodoClick?: (todo: ExpandedStudyPlanTodoEvent) => void;
  onTodoEdit?: (todo: ExpandedStudyPlanTodoEvent) => void;
  accentBar: AccentBarMode;
}

function StudyPlanTodoListRow({
  todo,
  profileSubjects,
  todosById,
  onTodoClick,
  onTodoEdit,
  accentBar,
}: StudyPlanTodoListRowProps) {
  const execution = getExecutionRecord(todosById?.get(todo.todoId), todo.date);
  const checkboxStatus = getCheckboxVisualState(execution);
  const executionLabel = execution
    ? getExecutionStatusLabel(execution.status)
    : '대기';
  const subjectCategory = resolveSubjectCategory(todo.subject, profileSubjects);
  const customAccentStyle = buildSubjectAccentBarStyle(todo.subject, profileSubjects);
  const customBadgeStyle = buildSubjectBadgeStyle(todo.subject, profileSubjects);

  return (
    <SwipeableListRow
      actionLabel="기록"
      onAction={() => onTodoClick?.(todo)}
      leadingLabel="수정"
      onLeadingAction={() => onTodoEdit?.(todo)}
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
        className={`touch-press flex w-full cursor-pointer items-center gap-3 text-left active:bg-gray-50 md:gap-3 md:active:bg-transparent dark:active:bg-zinc-800/60 dark:md:active:bg-transparent ${
          accentBar === 'grouped'
            ? 'py-3.5 pr-4 md:py-3 md:pr-3'
            : 'px-4 py-3.5 md:p-3'
        }`}
      >
        {accentBar === 'individual' ? (
          <>
            <span
              className={`hidden h-10 w-1 shrink-0 rounded-full md:block ${customAccentStyle ? '' : SUBJECT_ACCENT_COLORS[subjectCategory]}`}
              style={customAccentStyle}
              aria-hidden
            />
            <span
              className={`h-10 w-1 shrink-0 rounded-full md:hidden ${customAccentStyle ? '' : SUBJECT_ACCENT_COLORS[subjectCategory]}`}
              style={customAccentStyle}
              aria-hidden
            />
          </>
        ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${customBadgeStyle ? 'border md:border md:bg-white md:shadow-sm dark:md:bg-zinc-900 dark:md:shadow-sm' : SUBJECT_BADGE_STYLES[subjectCategory]}`}
                style={customBadgeStyle}
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
                  {(execution.status === 'completed' || execution.status === 'partial') &&
                    execution.achievementLevel != null &&
                    ` ${execution.achievementLevel}/10`}
                </span>
              )}
              <ExecutionStatusCheckbox status={checkboxStatus} />
            </div>
            {onTodoEdit ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onTodoEdit(todo);
                }}
                className="touch-press hidden shrink-0 rounded-lg border border-amber-300 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 md:inline-flex dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950"
              >
                수정
              </button>
            ) : null}
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-400 md:hidden" />
          </div>
        </div>
      </SwipeableListRow>
  );
}

export default function StudyPlanTodoList({
  selectedDate,
  onSelectedDateChange,
  events,
  todosById,
  dayStamp = null,
  examCountdown = null,
  loading = false,
  onTodoClick,
  onTodoEdit,
  onAddClick,
}: StudyPlanTodoListProps) {
  const { subjects: profileSubjects } = useProfileSubjectsContext();
  const [sortMode, setSortMode] = useState<StudyPlanTodoListSortMode>(() =>
    readStudyPlanTodoListSortMode()
  );
  const filteredDayTodos = useMemo(
    () => filterEventsByDate(events, selectedDate),
    [events, selectedDate]
  );
  const dayTodos = useMemo(() => {
    if (sortMode === 'time') {
      return filteredDayTodos;
    }

    return sortExpandedEventsBySubjectOrder(filteredDayTodos, profileSubjects);
  }, [filteredDayTodos, profileSubjects, sortMode]);
  const subjectGroups = useMemo(
    () => (sortMode === 'subject' ? groupConsecutiveTodosBySubject(dayTodos) : []),
    [dayTodos, sortMode]
  );
  const executedCount = countExecutedTodos(events, selectedDate, todosById ?? new Map());
  const todayIsoDate = getTodayIsoDate();
  const isToday = selectedDate === todayIsoDate;
  const weekDates = useMemo(
    () => getWeekDatesContaining(selectedDate),
    [selectedDate]
  );

  function handleSortToggle() {
    const nextMode: StudyPlanTodoListSortMode = sortMode === 'time' ? 'subject' : 'time';
    setSortMode(nextMode);
    writeStudyPlanTodoListSortMode(nextMode);
  }

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

        <div className="mt-3" role="group" aria-label="이번 주 날짜 선택">
          <div className="grid grid-cols-7 text-center">
            {weekDates.map((date) => {
              const weekdayIndex = new Date(`${date}T12:00:00`).getDay();
              const weekdayClass =
                weekdayIndex === 0
                  ? 'text-red-500 dark:text-red-400'
                  : weekdayIndex === 6
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400';

              return (
                <span
                  key={`label-${date}`}
                  className={`text-xs font-medium ${weekdayClass}`}
                  aria-hidden
                >
                  {WEEKDAY_LABELS[weekdayIndex]}
                </span>
              );
            })}
          </div>
          <div className="mt-1 grid grid-cols-7 text-center">
            {weekDates.map((date) => {
              const dayNumber = new Date(`${date}T12:00:00`).getDate();
              const isSelected = date === selectedDate;
              const isTodayDate = date === todayIsoDate;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onSelectedDateChange(date)}
                  aria-label={`${date} 선택`}
                  aria-current={isSelected ? 'date' : undefined}
                  className={`touch-press mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors ${
                    isSelected
                      ? 'bg-blue-100 font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-300'
                      : isTodayDate
                        ? 'font-bold text-blue-600 hover:bg-gray-100 dark:text-blue-400 dark:hover:bg-zinc-800'
                        : 'font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {dayNumber}
                </button>
              );
            })}
          </div>
        </div>
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
            {sortMode === 'subject'
              ? subjectGroups.map((group, groupIndex) => {
                  const subjectCategory = resolveSubjectCategory(
                    group.subject,
                    profileSubjects
                  );
                  const customRowStyle = buildSubjectRowStyle(group.subject, profileSubjects);
                  const customAccentStyle = buildSubjectAccentBarStyle(
                    group.subject,
                    profileSubjects
                  );
                  const useCustomColor = hasExplicitSubjectColor(group.subject, profileSubjects);

                  return (
                    <li
                      key={`${group.subject}-${group.todos[0]?.id ?? groupIndex}`}
                      className={`flex items-stretch overflow-hidden ${
                        useCustomColor
                          ? 'md:rounded-lg md:border md:shadow-sm md:transition-colors'
                          : SUBJECT_ROW_STYLES[subjectCategory]
                      } ${
                        groupIndex > 0
                          ? 'border-t border-gray-200 dark:border-neutral-800 md:border-t-0'
                          : ''
                      } md:rounded-lg md:border`}
                      style={customRowStyle}
                    >
                      <div
                        className={`ml-4 mr-3 flex w-1 shrink-0 flex-col self-stretch py-3.5 md:ml-3 md:mr-3 md:py-3 ${
                          group.todos.length === 1 ? 'items-center justify-center' : ''
                        }`}
                      >
                        <span
                          className={`w-1 rounded-full ${
                            customAccentStyle ? '' : SUBJECT_ACCENT_COLORS[subjectCategory]
                          } ${group.todos.length === 1 ? 'h-10' : 'min-h-10 flex-1'}`}
                          style={customAccentStyle}
                          aria-hidden
                        />
                      </div>
                      <div className="min-w-0 flex-1 divide-y divide-gray-200 dark:divide-neutral-800">
                        {group.todos.map((todo) => (
                          <StudyPlanTodoListRow
                            key={todo.id}
                            todo={todo}
                            profileSubjects={profileSubjects}
                            todosById={todosById}
                            onTodoClick={onTodoClick}
                            onTodoEdit={onTodoEdit}
                            accentBar="grouped"
                          />
                        ))}
                      </div>
                    </li>
                  );
                })
              : dayTodos.map((todo, index) => {
                  const subjectCategory = resolveSubjectCategory(
                    todo.subject,
                    profileSubjects
                  );
                  const customRowStyle = buildSubjectRowStyle(todo.subject, profileSubjects);
                  const useCustomColor = hasExplicitSubjectColor(todo.subject, profileSubjects);

                  return (
                    <li
                      key={todo.id}
                      className={`overflow-hidden ${
                        useCustomColor
                          ? 'md:rounded-lg md:border md:shadow-sm md:transition-colors'
                          : SUBJECT_ROW_STYLES[subjectCategory]
                      } ${
                        index > 0
                          ? 'border-t border-gray-200 dark:border-neutral-800 md:border-t-0'
                          : ''
                      } md:rounded-lg md:border`}
                      style={customRowStyle}
                    >
                      <StudyPlanTodoListRow
                        todo={todo}
                        profileSubjects={profileSubjects}
                        todosById={todosById}
                        onTodoClick={onTodoClick}
                        onTodoEdit={onTodoEdit}
                        accentBar="individual"
                      />
                    </li>
                  );
                })}
          </ul>
        )}

      </div>

      {!loading && (dayTodos.length > 0 || onAddClick || dayStamp) && (
        <div className="border-t border-gray-200 px-4 dark:border-neutral-800 md:px-4">
          <div
            className={`flex items-center justify-between gap-3 ${
              dayStamp ? 'min-h-28 py-2 sm:min-h-32' : 'py-3'
            }`}
          >
            <div className="min-w-0 flex-1 self-center">
              {dayTodos.length > 0 && (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    총 {dayTodos.length}개 · 실행 {executedCount}개
                  </p>
                  <button
                    type="button"
                    onClick={handleSortToggle}
                    className={SORT_TOGGLE_BUTTON_CLASS}
                    aria-label={sortMode === 'time' ? '과목별로 정렬' : '시간순으로 정렬'}
                  >
                    {sortMode === 'time' ? (
                      <>
                        <SubjectSortIcon className={SORT_TOGGLE_ICON_CLASS} />
                        과목별 정렬
                      </>
                    ) : (
                      <>
                        <TimeSortIcon className={SORT_TOGGLE_ICON_CLASS} />
                        시간순 정렬
                      </>
                    )}
                  </button>
                </>
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

            {dayStamp ? (
              <div
                className="flex shrink-0 items-center"
                aria-label={`매니저 확인도장: ${dayStamp.message}`}
              >
                <TodoDayStampVisual message={dayStamp.message} variant="footer" />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
