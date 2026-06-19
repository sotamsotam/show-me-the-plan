'use client';

import type { EventInput } from '@fullcalendar/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useExamCountdown } from '@/hooks/useExamCountdown';
import { useNeisTimetableEnabled } from '@/hooks/useNeisTimetableEnabled';
import { useStudentApi } from '@/hooks/useStudentApi';
import StudyPlanDayTimeline from '@/components/StudyPlanDayTimeline';
import DayStudyTimeProgress from '@/components/DayStudyTimeProgress';
import MobileFab from '@/components/MobileFab';
import StudyPlanTodoExecutionModal from '@/components/StudyPlanTodoExecutionModal';
import StudyPlanTodoForm, {
  type StudyPlanTodoFormInitial,
} from '@/components/StudyPlanTodoForm';
import StudyPlanTodoList from '@/components/StudyPlanTodoList';
import {
  ProgressCardSkeleton,
  TimelineSkeleton,
} from '@/components/skeletons/MobileSkeletons';
import {
  calculateExecutedStudyMinutes,
  calculatePlannedStudyMinutes,
  type DayViewMode,
} from '@/lib/day-timeline';
import {
  filterEventsByDate,
  getExecutionRecord,
  type ExpandedStudyPlanTodoEvent,
  type StudyPlanTodo,
} from '@/lib/study-plan-todo';
import {
  buildStudyPlanTodosSearchParams,
  fetchStudyPlanTodosInRange,
  STUDY_PLAN_TODO_INCLUDE,
} from '@/lib/study-plan-todo-api';
import { getMonthRange, getTodayIsoDate } from '@/lib/user-schedule';

const MOBILE_MEDIA_QUERY = '(max-width: 640px)';

function getIsMobileViewport() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

export default function StudyPlanTodoPage() {
  const { withStudent, studentUserId } = useStudentApi();
  const { usesNeisTimetable, loading: neisProfileLoading } = useNeisTimetableEnabled();
  const [selectedDate, setSelectedDate] = useState(getTodayIsoDate);
  const referenceYmd = useMemo(
    () => selectedDate.replaceAll('-', ''),
    [selectedDate]
  );
  const { countdown } = useExamCountdown({ referenceYmd });
  const [viewMode, setViewMode] = useState<DayViewMode>('combined');
  const [events, setEvents] = useState<ExpandedStudyPlanTodoEvent[]>([]);
  const [todos, setTodos] = useState<StudyPlanTodo[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(getIsMobileViewport);
  const [modalOpen, setModalOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<StudyPlanTodoFormInitial | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<ExpandedStudyPlanTodoEvent | null>(
    null
  );
  const fetchIdRef = useRef(0);
  const loadedRangeRef = useRef<{ start: string; end: string } | null>(null);

  const todosById = useMemo(
    () => new Map(todos.map((todo) => [todo.id, todo])),
    [todos]
  );

  const dayTodos = useMemo(
    () => filterEventsByDate(events, selectedDate),
    [events, selectedDate]
  );

  const plannedMinutes = useMemo(
    () => calculatePlannedStudyMinutes(events, selectedDate),
    [events, selectedDate]
  );

  const executedMinutes = useMemo(
    () => calculateExecutedStudyMinutes(events, selectedDate, todosById),
    [events, selectedDate, todosById]
  );

  const existingRecord = useMemo(() => {
    if (!selectedEvent) {
      return undefined;
    }

    return getExecutionRecord(todosById.get(selectedEvent.todoId), selectedEvent.date);
  }, [selectedEvent, todosById]);

  const fetchPageData = useCallback(async (date: string, force = false) => {
    const { start, end } = getMonthRange(date);

    if (
      !force &&
      loadedRangeRef.current?.start === start &&
      loadedRangeRef.current?.end === end
    ) {
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError('');

    const scheduleParams = new URLSearchParams({ start, end });
    const todoParams = buildStudyPlanTodosSearchParams({
      start,
      end,
      include: STUDY_PLAN_TODO_INCLUDE.withExecutions,
    });

    try {
      const shouldFetchTimetable = !neisProfileLoading && usesNeisTimetable;
      const timetablePromise = shouldFetchTimetable
        ? fetch(withStudent(`/api/timetable?${scheduleParams}`), { credentials: 'include' })
        : Promise.resolve(
            new Response(JSON.stringify({ events: [] }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );

      const [todoResult, timetableRes, userRes] = await Promise.all([
        fetchStudyPlanTodosInRange(withStudent(`/api/study-plan-todos?${todoParams}`)),
        timetablePromise,
        fetch(withStudent(`/api/user-schedules?${scheduleParams}`), { credentials: 'include' }),
      ]);
      const timetableData = await timetableRes.json();
      const userData = await userRes.json();

      if (fetchId !== fetchIdRef.current) {
        return;
      }

      const errors: string[] = [];

      if (!todoResult.ok) {
        setEvents([]);
        setTodos([]);
        errors.push(todoResult.error);
      } else {
        setEvents(todoResult.data.expandedEvents ?? []);
        setTodos(todoResult.data.todos ?? []);
      }

      const nextScheduleEvents: EventInput[] = [
        ...(timetableRes.ok ? (timetableData.events ?? []) : []),
        ...(userRes.ok ? (userData.events ?? []) : []),
      ];
      setScheduleEvents(nextScheduleEvents);

      if (shouldFetchTimetable && !timetableRes.ok) {
        errors.push(timetableData.error ?? '시간표를 불러오지 못했습니다.');
      }

      if (!userRes.ok) {
        errors.push(userData.error ?? '일정을 불러오지 못했습니다.');
      }

      setError(errors[0] ?? '');
      loadedRangeRef.current = { start, end };
    } catch {
      if (fetchId !== fetchIdRef.current) {
        return;
      }

      setEvents([]);
      setTodos([]);
      setScheduleEvents([]);
      setError('데이터를 불러오지 못했습니다.');
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [withStudent, neisProfileLoading, usesNeisTimetable]);

  useEffect(() => {
    loadedRangeRef.current = null;
    fetchPageData(selectedDate, true);
  }, [selectedDate, studentUserId, fetchPageData]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handleChange = () => {
      setIsMobile(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const openCreateForm = useCallback(() => {
    setFormInitial({
      date: selectedDate,
      recurrenceType: 'once',
    });
    setFormOpen(true);
  }, [selectedDate]);

  function handleTodoClick(todo: ExpandedStudyPlanTodoEvent) {
    setSelectedEvent(todo);
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setSelectedEvent(null);
  }

  function handleSaved() {
    loadedRangeRef.current = null;
    fetchPageData(selectedDate, true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setFormInitial(undefined);
  }

  const achievementRate =
    plannedMinutes > 0 ? Math.round((executedMinutes / plannedMinutes) * 100) : null;

  return (
    <div className="mx-auto w-full">
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
        <StudyPlanTodoList
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          events={events}
          todosById={todosById}
          examCountdown={countdown}
          loading={loading}
          onTodoClick={handleTodoClick}
          onAddClick={openCreateForm}
        />

        <div className="flex min-w-0 flex-col gap-4">
          <div className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
            {loading ? (
              <ProgressCardSkeleton />
            ) : (
              <DayStudyTimeProgress
                plannedMinutes={plannedMinutes}
                executedMinutes={executedMinutes}
                achievementRate={achievementRate}
              />
            )}
          </div>

          {loading ? (
            <div className="w-full rounded-xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
              <TimelineSkeleton />
            </div>
          ) : (
            <StudyPlanDayTimeline
              selectedDate={selectedDate}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              dayTodos={dayTodos}
              todosById={todosById}
              scheduleEvents={scheduleEvents}
              loading={loading}
            />
          )}
        </div>
      </div>

      <StudyPlanTodoExecutionModal
        open={modalOpen}
        todo={selectedEvent}
        existingRecord={existingRecord}
        onClose={handleModalClose}
        onSaved={handleSaved}
      />

      <StudyPlanTodoForm
        open={formOpen}
        mode="create"
        initial={formInitial}
        onClose={handleFormClose}
        onSaved={() => {
          handleFormClose();
          handleSaved();
        }}
      />

      {isMobile && (
        <MobileFab label="스터디 플랜 추가" onClick={openCreateForm} />
      )}
    </div>
  );
}
