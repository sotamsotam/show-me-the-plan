'use client';

import type { EventInput } from '@fullcalendar/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useExamCountdown } from '@/hooks/useExamCountdown';
import { useNeisTimetableEnabled } from '@/hooks/useNeisTimetableEnabled';
import { useStudentApi } from '@/hooks/useStudentApi';
import { useStudyPlanTodosInRange } from '@/hooks/useStudyPlanTodosInRange';
import { useUserSchedulesInRange } from '@/hooks/useUserSchedulesInRange';
import StudyPlanDayTimeline from '@/components/StudyPlanDayTimeline';
import DayStudyTimeProgress from '@/components/DayStudyTimeProgress';
import MobileFab from '@/components/MobileFab';
import StudyPlanOccurrenceChooser from '@/components/StudyPlanOccurrenceChooser';
import StudyPlanTodoExecutionModal from '@/components/StudyPlanTodoExecutionModal';
import StudyPlanTodoForm, {
  type StudyPlanTodoFormInitial,
  type StudyPlanTodoFormMode,
} from '@/components/StudyPlanTodoForm';
import StudyPlanTodoList from '@/components/StudyPlanTodoList';
import {
  ProgressCardSkeleton,
  TimelineSkeleton,
} from '@/components/skeletons/MobileSkeletons';
import { invalidateStudyPlanTodos } from '@/lib/dashboard-data-invalidation';
import { useStudySession } from '@/hooks/useStudySession';
import { fetchTodoDayStampsInRange, type TodoDayStamp } from '@/lib/todo-day-stamp';
import { findTodoDayStampForDate } from '@/lib/todo-day-stamp-helpers';
import {
  calculateExecutedStudyMinutes,
  calculatePlannedStudyMinutes,
  type DayViewMode,
} from '@/lib/day-timeline';
import {
  buildInitialFromExpandedEvent,
  resolveEditFormMode,
  shouldShowOccurrenceChooser,
} from '@/lib/study-plan-todo-edit';
import {
  filterEventsByDate,
  getExecutionRecord,
  type ExpandedStudyPlanTodoEvent,
  type StudyPlanTodo,
} from '@/lib/study-plan-todo';
import { formatOccurrenceDateLabel, getMonthRange, getTodayIsoDate } from '@/lib/user-schedule';

const MOBILE_MEDIA_QUERY = '(max-width: 640px)';

function getIsMobileViewport() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

export default function StudyPlanTodoPage() {
  const { withStudent, studentUserId } = useStudentApi();
  const { usesNeisTimetable, loading: neisProfileLoading } = useNeisTimetableEnabled();
  const [selectedDate, setSelectedDate] = useState(getTodayIsoDate);
  const monthRange = useMemo(() => getMonthRange(selectedDate), [selectedDate]);
  const referenceYmd = useMemo(
    () => selectedDate.replaceAll('-', ''),
    [selectedDate]
  );
  const { countdown } = useExamCountdown({ referenceYmd });
  const [viewMode, setViewMode] = useState<DayViewMode>('combined');
  const [timetableEvents, setTimetableEvents] = useState<EventInput[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [timetableError, setTimetableError] = useState('');
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(getIsMobileViewport);
  const [modalOpen, setModalOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<StudyPlanTodoFormMode>('create');
  const [formInitial, setFormInitial] = useState<StudyPlanTodoFormInitial | undefined>();
  const [editingTodo, setEditingTodo] = useState<StudyPlanTodo | null>(null);
  const [editOccurrenceDate, setEditOccurrenceDate] = useState('');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [chooserTodo, setChooserTodo] = useState<StudyPlanTodo | null>(null);
  const [chooserOccurrenceDate, setChooserOccurrenceDate] = useState('');
  const [pendingEditEvent, setPendingEditEvent] = useState<ExpandedStudyPlanTodoEvent | null>(
    null
  );
  const [selectedEvent, setSelectedEvent] = useState<ExpandedStudyPlanTodoEvent | null>(
    null
  );
  const [dayStamp, setDayStamp] = useState<TodoDayStamp | null>(null);
  const fetchIdRef = useRef(0);
  const stampFetchIdRef = useRef(0);
  const {
    todos,
    expandedEvents: events,
    isLoading: studyPlanTodosLoading,
    error: studyPlanTodosError,
    refetch: refetchStudyPlanTodos,
  } = useStudyPlanTodosInRange({
    start: monthRange.start,
    end: monthRange.end,
  });
  const {
    events: userScheduleEvents,
    isLoading: userSchedulesLoading,
    error: userSchedulesError,
  } = useUserSchedulesInRange({
    start: monthRange.start,
    end: monthRange.end,
  });
  const scheduleEvents = useMemo(
    () => [...timetableEvents, ...userScheduleEvents],
    [timetableEvents, userScheduleEvents]
  );
  const loading = timetableLoading || studyPlanTodosLoading || userSchedulesLoading;
  const loadError = timetableError || studyPlanTodosError || userSchedulesError;

  const todosById = useMemo(
    () => new Map(todos.map((todo) => [todo.id, todo])),
    [todos]
  );

  const dayTodos = useMemo(
    () => filterEventsByDate(events, selectedDate),
    [events, selectedDate]
  );

  const { notifyExecutionSaved } = useStudySession(events);

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

  const fetchTimetableEvents = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setTimetableLoading(true);
    setTimetableError('');

    const params = new URLSearchParams({
      start: monthRange.start,
      end: monthRange.end,
    });

    try {
      const shouldFetchTimetable = !neisProfileLoading && usesNeisTimetable;

      if (!shouldFetchTimetable) {
        if (fetchId === fetchIdRef.current) {
          setTimetableEvents([]);
        }
        return;
      }

      const timetableRes = await fetch(withStudent(`/api/timetable?${params}`), {
        credentials: 'include',
      });
      const timetableData = await timetableRes.json();

      if (fetchId !== fetchIdRef.current) {
        return;
      }

      if (!timetableRes.ok) {
        setTimetableEvents([]);
        setTimetableError(timetableData.error ?? '시간표를 불러오지 못했습니다.');
        return;
      }

      setTimetableEvents(timetableData.events ?? []);
    } catch {
      if (fetchId === fetchIdRef.current) {
        setTimetableEvents([]);
        setTimetableError('시간표를 불러오지 못했습니다.');
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setTimetableLoading(false);
      }
    }
  }, [monthRange.end, monthRange.start, neisProfileLoading, usesNeisTimetable, withStudent]);

  useEffect(() => {
    void fetchTimetableEvents();
  }, [fetchTimetableEvents, studentUserId]);

  useEffect(() => {
    const fetchId = ++stampFetchIdRef.current;

    async function loadDayStamps() {
      const result = await fetchTodoDayStampsInRange({
        start: monthRange.start,
        end: monthRange.end,
        studentUserId,
      });

      if (fetchId !== stampFetchIdRef.current) {
        return;
      }

      if (!result.ok) {
        setDayStamp(null);
        return;
      }

      setDayStamp(findTodoDayStampForDate(result.stamps, selectedDate) ?? null);
    }

    void loadDayStamps();
  }, [monthRange.end, monthRange.start, selectedDate, studentUserId]);

  const handleSaved = useCallback(() => {
    invalidateStudyPlanTodos(studentUserId);
    void refetchStudyPlanTodos(true);
  }, [refetchStudyPlanTodos, studentUserId]);

  const closeChooser = useCallback(() => {
    setChooserOpen(false);
    setChooserTodo(null);
    setChooserOccurrenceDate('');
    setPendingEditEvent(null);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setFormInitial(undefined);
    setEditingTodo(null);
    setEditOccurrenceDate('');
    setFormMode('create');
    setPendingEditEvent(null);
  }, []);

  const openEditForm = useCallback(
    (
      todo: StudyPlanTodo,
      mode: 'once' | 'occurrence' | 'series',
      occurrenceDate: string,
      event?: ExpandedStudyPlanTodoEvent | null
    ) => {
      setEditingTodo(todo);
      setEditOccurrenceDate(occurrenceDate);
      setFormInitial(event ? buildInitialFromExpandedEvent(event) : undefined);
      setFormMode(mode);
      setChooserOpen(false);
      setChooserTodo(null);
      setChooserOccurrenceDate('');
      setFormOpen(true);
    },
    []
  );

  const openCreateForm = useCallback(() => {
    setEditingTodo(null);
    setEditOccurrenceDate('');
    setFormMode('create');
    setFormInitial({
      date: selectedDate,
      recurrenceType: 'once',
    });
    setFormOpen(true);
  }, [selectedDate]);

  const handleTodoClick = useCallback((todo: ExpandedStudyPlanTodoEvent) => {
    setSelectedEvent(todo);
    setModalOpen(true);
  }, []);

  const handleTodoEdit = useCallback(
    (event: ExpandedStudyPlanTodoEvent) => {
      const todo = todosById.get(event.todoId);

      if (!todo) {
        return;
      }

      if (shouldShowOccurrenceChooser(event)) {
        setPendingEditEvent(event);
        setChooserTodo(todo);
        setChooserOccurrenceDate(event.date);
        setChooserOpen(true);
        return;
      }

      openEditForm(todo, resolveEditFormMode(event), event.date, event);
    },
    [openEditForm, todosById]
  );

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setSelectedEvent(null);
  }, []);

  const handleDeleteOccurrence = useCallback(async () => {
    if (!chooserTodo || !chooserOccurrenceDate) {
      return;
    }

    if (
      !confirm(
        `${formatOccurrenceDateLabel(chooserOccurrenceDate)} 스터디 플랜만 삭제할까요?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        withStudent(
          `/api/study-plan-todos/${chooserTodo.id}/occurrences/${chooserOccurrenceDate}`
        ),
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '이 날짜 스터디 플랜 삭제에 실패했습니다.');
        return;
      }

      closeChooser();
      handleSaved();
    } catch {
      setError('이 날짜 스터디 플랜 삭제에 실패했습니다.');
    }
  }, [chooserOccurrenceDate, chooserTodo, closeChooser, handleSaved, withStudent]);

  const achievementRate =
    plannedMinutes > 0 ? Math.round((executedMinutes / plannedMinutes) * 100) : null;

  return (
    <div className="mx-auto w-full">
      {(error || loadError) && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error || loadError}
        </p>
      )}

      <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
        <StudyPlanTodoList
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          events={events}
          todosById={todosById}
          dayStamp={dayStamp}
          examCountdown={countdown}
          loading={loading}
          onTodoClick={handleTodoClick}
          onTodoEdit={handleTodoEdit}
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
        onSaved={() => {
          if (selectedEvent) {
            notifyExecutionSaved(selectedEvent.todoId, selectedEvent.date);
          }
          handleSaved();
        }}
      />

      {chooserTodo && chooserOccurrenceDate && (
        <StudyPlanOccurrenceChooser
          open={chooserOpen}
          todo={chooserTodo}
          occurrenceDate={chooserOccurrenceDate}
          onClose={closeChooser}
          onEditOccurrence={() => {
            openEditForm(
              chooserTodo,
              'occurrence',
              chooserOccurrenceDate,
              pendingEditEvent
            );
          }}
          onDeleteOccurrence={handleDeleteOccurrence}
          onEditSeries={() => {
            openEditForm(chooserTodo, 'series', chooserOccurrenceDate);
          }}
        />
      )}

      <StudyPlanTodoForm
        open={formOpen}
        mode={formMode}
        todo={editingTodo}
        occurrenceDate={formMode === 'occurrence' ? editOccurrenceDate : undefined}
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
