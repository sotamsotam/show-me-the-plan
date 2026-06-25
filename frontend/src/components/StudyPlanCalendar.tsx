'use client';

import koLocale from '@fullcalendar/core/locales/ko';
import type {
  DateSelectArg,
  DatesSetArg,
  EventChangeArg,
  EventClickArg,
  EventContentArg,
  EventInput,
  EventMountArg,
} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNeisTimetableEnabled } from '@/hooks/useNeisTimetableEnabled';
import { useStudentApi } from '@/hooks/useStudentApi';
import { useStudyPlanTodosInRange } from '@/hooks/useStudyPlanTodosInRange';
import { useUserSchedulesInRange } from '@/hooks/useUserSchedulesInRange';
import { invalidateStudyPlanTodos } from '@/lib/dashboard-data-invalidation';
import StudyPlanOccurrenceChooser from '@/components/StudyPlanOccurrenceChooser';
import StudyPlanTodoForm, {
  buildInitialFromSelection,
  type StudyPlanTodoFormInitial,
  type StudyPlanTodoFormMode,
} from '@/components/StudyPlanTodoForm';
import { renderCalendarEventContent } from '@/components/calendar/CalendarEventContent';
import CalendarEditHint from '@/components/calendar/CalendarEditHint';
import { useProfileSubjectsContext } from '@/contexts/ProfileSubjectsContext';
import CalendarExamCountdownBadge from '@/components/calendar/CalendarExamCountdownBadge';
import CalendarWeeklyPlanToolbarToggle from '@/components/calendar/CalendarWeeklyPlanToolbarToggle';
import WeeklyPlanPanel from '@/components/calendar/WeeklyPlanPanel';
import MobileFab from '@/components/MobileFab';
import { buildCalendarEditHint } from '@/lib/calendar-edit-hint';
import { useExamCountdown } from '@/hooks/useExamCountdown';
import { useExamPrepWeeklyPlansContext } from '@/hooks/useExamPrepWeeklyPlansContext';
import { useVacationPeriodSettings } from '@/hooks/useVacationPeriodSettings';
import { useRegularWeeklyPlansContext } from '@/hooks/useRegularWeeklyPlansContext';
import { useVacationWeeklyPlansContext } from '@/hooks/useVacationWeeklyPlansContext';
import { useExamPrepDayHeader } from '@/hooks/useExamPrepDayHeader';
import type { VisibleDateRange } from '@/lib/exam-prep-visible-week-plans';
import { isVisibleRangeInAnyWeeklyPlanPeriod } from '@/lib/weekly-plan-panel';
import {
  buildStudyPlanEventId,
  buildStudyPlanOccurrenceKey,
  isOccurrenceOnlyStudyPlanEvent,
  matchesStudyPlanEditSession,
  type StudyPlanEditSession,
} from '@/lib/calendar-edit-session';
import { parseEventDateTimeRange } from '@/lib/calendar-event-range';
import { validateScheduleTimeRange } from '@/lib/schedule-time';
import {
  buildWeeklyTodoMovePayload,
  validateOccurrenceMoveTarget,
} from '@/lib/study-plan-todo-occurrence';
import type { ExpandedStudyPlanTodoEvent, StudyPlanTodo } from '@/lib/study-plan-todo';
import { expandedEventsToCalendarEvents, resolveOccurrenceFields } from '@/lib/study-plan-todo';
import { mountCalendarEventSubjectColor } from '@/lib/subject-color';
import { formatOccurrenceDateLabel } from '@/lib/user-schedule';

const CALENDAR_PLUGINS = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin];

const MOBILE_MEDIA_QUERY = '(max-width: 640px)';

const DESKTOP_HEADER_TOOLBAR = {
  left: 'prev,next today',
  center: 'title',
  right: 'dayGridMonth,timeGridWeek,timeGridDay',
} as const;

const MOBILE_HEADER_TOOLBAR = {
  left: 'listWeek,timeGridDay prev,next today',
  center: 'title',
  right: '',
} as const;

const MOBILE_LIST_VIEW = 'listWeek';
const MOBILE_DAY_VIEW = 'timeGridDay';
const DESKTOP_WEEK_VIEW = 'timeGridWeek';

const CALENDAR_HEIGHT = 660;
const ALL_DAY_SLOT_HEIGHT = 30;
const DRAFT_EVENT_ID = 'draft-study-plan';
const DRAFT_DURATION_MS = 60 * 60 * 1000;
const SLOT_MIN_TIME = '05:00:00';
const SLOT_MAX_TIME = '28:00:00';

interface DraftSlot {
  start: Date;
  end: Date;
}

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildRangeKey(arg: DatesSetArg): string {
  return `${arg.view.type}:${formatIsoDate(arg.start)}:${formatIsoDate(arg.end)}`;
}

function isEditableStudyPlanEvent(extendedProps: Record<string, unknown>): boolean {
  return extendedProps.type === 'study-plan';
}

function mergeEventClassNames(
  classNames: EventInput['classNames'],
  extra: string[]
): string[] {
  const base = Array.isArray(classNames)
    ? classNames
    : classNames
      ? [String(classNames)]
      : [];

  return [...base, ...extra];
}

function resolveBackgroundClassNames(classNames: EventInput['classNames']): string[] {
  const names = Array.isArray(classNames)
    ? classNames
    : classNames
      ? [classNames]
      : [];

  const result: string[] = ['cal-bg-event'];

  const subjectClass = names.find((name) => name.startsWith('subject-'));
  if (subjectClass) {
    result.push(subjectClass);
  }

  if (names.includes('school-event')) {
    result.push('schedule-bg-school');
    return result;
  }

  if (names.includes('user-event-fixed')) {
    result.push('schedule-bg-user-fixed');
    return result;
  }

  if (names.includes('user-event-academy')) {
    result.push('schedule-bg-user-academy');
    return result;
  }

  if (names.includes('user-event-other')) {
    result.push('schedule-bg-user-other');
    return result;
  }

  if (names.includes('user-event-managed')) {
    result.push('schedule-bg-user-managed');
    return result;
  }

  if (names.includes('user-event')) {
    result.push('schedule-bg-user-managed');
    return result;
  }

  result.push('schedule-bg-default');
  return result;
}

function isAllDayScheduleEvent(event: EventInput): boolean {
  if (event.allDay) {
    return true;
  }

  const type = (event.extendedProps as Record<string, unknown> | undefined)?.type;
  return type === 'school-exam' || type === 'school-holiday';
}

function toBackgroundEvents(events: EventInput[]): EventInput[] {
  return events.map((event) => ({
    ...event,
    display: 'background',
    editable: false,
    classNames: resolveBackgroundClassNames(event.classNames),
    extendedProps: {
      ...event.extendedProps,
      isScheduleBackground: true,
    },
  }));
}

function partitionScheduleEvents(events: EventInput[]): {
  backgroundEvents: EventInput[];
  allDayEvents: EventInput[];
} {
  const timed: EventInput[] = [];
  const allDay: EventInput[] = [];

  for (const event of events) {
    if (isAllDayScheduleEvent(event)) {
      allDay.push(event);
    } else {
      timed.push(event);
    }
  }

  return {
    backgroundEvents: toBackgroundEvents(timed),
    allDayEvents: allDay,
  };
}

function draftToEventInput(draft: DraftSlot): EventInput {
  return {
    id: DRAFT_EVENT_ID,
    title: '새 스터디 플랜',
    start: draft.start,
    end: draft.end,
    editable: true,
    durationEditable: true,
    classNames: ['draft-event', 'cal-event-card'],
    extendedProps: {
      type: 'draft',
    },
  };
}

function createDraftFromSelection(start: Date, end: Date): DraftSlot {
  const selectedMs = end.getTime() - start.getTime();

  if (selectedMs < DRAFT_DURATION_MS) {
    return {
      start,
      end: new Date(start.getTime() + DRAFT_DURATION_MS),
    };
  }

  return { start, end };
}

function getIsMobileViewport() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function resolveDefaultCalendarView(isMobile: boolean): string {
  return isMobile ? MOBILE_LIST_VIEW : DESKTOP_WEEK_VIEW;
}

function isListCalendarView(viewType: string): boolean {
  return viewType.startsWith('list');
}

function isMobileDayCalendarView(isMobile: boolean, viewType: string): boolean {
  return isMobile && viewType === MOBILE_DAY_VIEW;
}

export default function StudyPlanCalendar() {
  const { withStudent, studentUserId } = useStudentApi();
  const { usesNeisTimetable, loading: neisProfileLoading } = useNeisTimetableEnabled();
  const { subjects: profileSubjects } = useProfileSubjectsContext();
  const renderEventContent = useCallback(
    (arg: EventContentArg) => renderCalendarEventContent(arg, profileSubjects),
    [profileSubjects]
  );
  const handleEventDidMount = useCallback((arg: EventMountArg) => {
    mountCalendarEventSubjectColor(arg.el, arg.event.extendedProps);
  }, []);
  const [isMobile, setIsMobile] = useState(getIsMobileViewport);
  const [activeViewType, setActiveViewType] = useState(() =>
    resolveDefaultCalendarView(getIsMobileViewport())
  );
  const [scheduleRange, setScheduleRange] = useState<{ start: string; end: string } | null>(
    null
  );
  const [timetableEvents, setTimetableEvents] = useState<EventInput[]>([]);
  const [draftEvent, setDraftEvent] = useState<DraftSlot | null>(null);
  const [editSession, setEditSession] = useState<StudyPlanEditSession | null>(null);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [timetableError, setTimetableError] = useState('');
  const [savingDrag, setSavingDrag] = useState(false);
  const [error, setError] = useState('');
  const {
    events: userScheduleEvents,
    isLoading: userSchedulesLoading,
    error: userSchedulesError,
  } = useUserSchedulesInRange({
    start: scheduleRange?.start ?? '',
    end: scheduleRange?.end ?? '',
    enabled: Boolean(scheduleRange),
  });
  const {
    todos: studyPlanTodos,
    expandedEvents: expandedTodoEvents,
    isLoading: studyPlanTodosLoading,
    error: studyPlanTodosError,
    refetch: refetchStudyPlanTodos,
  } = useStudyPlanTodosInRange({
    start: scheduleRange?.start ?? '',
    end: scheduleRange?.end ?? '',
    enabled: Boolean(scheduleRange),
  });
  const scheduleEvents = useMemo(
    () => [...timetableEvents, ...userScheduleEvents],
    [timetableEvents, userScheduleEvents]
  );
  const loading = timetableLoading || userSchedulesLoading || studyPlanTodosLoading;
  const loadError = timetableError || userSchedulesError || studyPlanTodosError;
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<StudyPlanTodoFormMode>('create');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<StudyPlanTodo | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<StudyPlanTodo | null>(null);
  const [selectedOccurrenceDate, setSelectedOccurrenceDate] = useState('');
  const [formInitial, setFormInitial] = useState<StudyPlanTodoFormInitial | undefined>();
  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const [toolbarVersion, setToolbarVersion] = useState(0);
  const [weeklyPlanPanelOpen, setWeeklyPlanPanelOpen] = useState(() => !getIsMobileViewport());
  const [visibleRange, setVisibleRange] = useState<VisibleDateRange | null>(null);
  const { countdown, examPrepPeriods } = useExamCountdown({ visibleRange });
  const { context: examPrepPlansContext, loading: examPrepPlansLoading } =
    useExamPrepWeeklyPlansContext();
  const { context: vacationPlansContext, loading: vacationPlansLoading } =
    useVacationWeeklyPlansContext();
  const { context: regularPlansContext, loading: regularPlansLoading } =
    useRegularWeeklyPlansContext();
  const { vacationPeriods } = useVacationPeriodSettings();
  const { dayHeaderClassNames: examPrepDayHeaderClassNames, dayHeaderContent: examPrepDayHeaderContent } =
    useExamPrepDayHeader(examPrepPeriods, vacationPeriods);
  const fetchIdRef = useRef(0);
  const lastRangeKeyRef = useRef<string | null>(null);
  const currentRangeRef = useRef<{ start: Date; end: Date } | null>(null);
  const editSessionRef = useRef<StudyPlanEditSession | null>(null);
  const occurrenceOnlyKeysRef = useRef<Set<string>>(new Set());
  const savingDragRef = useRef(false);

  useEffect(() => {
    editSessionRef.current = editSession;
  }, [editSession]);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      const session = editSessionRef.current;
      if (!session) {
        return;
      }

      if (session.editScope === 'occurrence') {
        occurrenceOnlyKeysRef.current.delete(
          buildStudyPlanOccurrenceKey(session.todoId, session.occurrenceDate)
        );
      }

      setEditSession(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const clearEditSession = useCallback(() => {
    setEditSession(null);
  }, []);

  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) {
      return;
    }

    const targetView = resolveDefaultCalendarView(isMobile);
    if (calendarApi.view.type !== targetView) {
      setDraftEvent(null);
      clearEditSession();
      calendarApi.changeView(targetView);
    }
  }, [isMobile, clearEditSession]);

  const isListView = isListCalendarView(activeViewType);
  const isMonthView = activeViewType === 'dayGridMonth';
  const isMobileDayView = isMobileDayCalendarView(isMobile, activeViewType);

  const calendarLocale = useMemo(
    () => ({
      ...koLocale,
      buttonText: {
        ...koLocale.buttonText,
        list: '주간',
        listWeek: '주간',
        timeGridDay: '일간',
      },
    }),
    []
  );

  const todoEvents = useMemo(
    () => expandedEventsToCalendarEvents(expandedTodoEvents, profileSubjects),
    [expandedTodoEvents, profileSubjects]
  );

  const { backgroundEvents, allDayEvents: allDayScheduleEvents } = useMemo(
    () => partitionScheduleEvents(scheduleEvents),
    [scheduleEvents]
  );

  const editableTodoEvents = useMemo(() => {
    return todoEvents.map((event) => {
      const props = (event.extendedProps ?? {}) as Record<string, unknown>;
      const todoId = Number(props.todoId);
      const occurrenceDate = String(props.date ?? '');

      if (
        !matchesStudyPlanEditSession(
          editSession,
          String(event.id ?? ''),
          todoId,
          occurrenceDate
        )
      ) {
        return event;
      }

      return {
        ...event,
        editable: true,
        durationEditable: true,
        classNames: mergeEventClassNames(event.classNames, ['event-editing']),
      };
    });
  }, [todoEvents, editSession]);

  const calendarEvents = useMemo(() => {
    const events = isListView
      ? [...allDayScheduleEvents, ...editableTodoEvents]
      : isMonthView
        ? [...allDayScheduleEvents]
        : [...backgroundEvents, ...allDayScheduleEvents, ...editableTodoEvents];

    if (draftEvent && !isListView && !isMonthView) {
      events.push(draftToEventInput(draftEvent));
    }

    return events;
  }, [
    allDayScheduleEvents,
    backgroundEvents,
    draftEvent,
    editableTodoEvents,
    isListView,
    isMonthView,
  ]);

  const closeAllModals = useCallback(() => {
    setFormOpen(false);
    setChooserOpen(false);
    setEditingTodo(null);
    setSelectedTodo(null);
    setSelectedOccurrenceDate('');
    setFormInitial(undefined);
    setFormMode('create');
  }, []);

  const fetchTimetableEvents = useCallback(
    async (start: Date, end: Date) => {
      const fetchId = ++fetchIdRef.current;
      setTimetableLoading(true);
      setTimetableError('');
      currentRangeRef.current = { start, end };
      setScheduleRange({
        start: formatIsoDate(start),
        end: formatIsoDate(end),
      });

      const params = new URLSearchParams({
        start: formatIsoDate(start),
        end: formatIsoDate(end),
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
    },
    [withStudent, neisProfileLoading, usesNeisTimetable]
  );

  useEffect(() => {
    lastRangeKeyRef.current = null;
    if (currentRangeRef.current) {
      void fetchTimetableEvents(
        currentRangeRef.current.start,
        currentRangeRef.current.end
      );
    }
  }, [studentUserId, fetchTimetableEvents]);

  const refreshCalendar = useCallback(() => {
    lastRangeKeyRef.current = null;
    invalidateStudyPlanTodos(studentUserId);
    void refetchStudyPlanTodos(true);
  }, [refetchStudyPlanTodos, studentUserId]);

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      setActiveViewType(arg.view.type);
      setToolbarVersion((version) => version + 1);
      setVisibleRange({ start: arg.start, end: arg.end });

      const rangeKey = buildRangeKey(arg);

      if (lastRangeKeyRef.current === rangeKey) {
        return;
      }

      lastRangeKeyRef.current = rangeKey;
      void fetchTimetableEvents(arg.start, arg.end);
    },
    [fetchTimetableEvents]
  );

  const handleFormClose = useCallback(() => {
    if (formMode === 'create') {
      setDraftEvent(null);
    }
    clearEditSession();
    closeAllModals();
  }, [formMode, closeAllModals, clearEditSession]);

  const openCreateForm = useCallback((initial?: StudyPlanTodoFormInitial) => {
    clearEditSession();
    setEditingTodo(null);
    setSelectedTodo(null);
    setSelectedOccurrenceDate('');
    setChooserOpen(false);
    setFormInitial(initial);
    setFormMode('create');
    setFormOpen(true);
  }, [clearEditSession]);

  const openFormFromDraft = useCallback(
    (draft: DraftSlot) => {
      openCreateForm(buildInitialFromSelection(draft.start, draft.end));
    },
    [openCreateForm]
  );

  const startEditSession = useCallback(
    (
      eventId: string,
      todoId: number,
      editScope: StudyPlanEditSession['editScope'],
      occurrenceDate: string
    ) => {
      setEditSession({
        eventId,
        todoId,
        editScope,
        occurrenceDate,
      });
    },
    []
  );

  const openEditFormFromEvent = useCallback(
    (
      todo: StudyPlanTodo,
      mode: 'once' | 'occurrence',
      occurrenceDate: string,
      start: Date,
      end: Date
    ) => {
      setEditingTodo(todo);
      setSelectedOccurrenceDate(occurrenceDate);
      setFormInitial(buildInitialFromSelection(start, end));
      setFormMode(mode);
      setChooserOpen(false);
      setFormOpen(true);
    },
    []
  );

  const handleSelect = useCallback(
    (arg: DateSelectArg) => {
      if (isListCalendarView(arg.view.type) || arg.view.type === 'dayGridMonth') {
        return;
      }

      arg.view.calendar.unselect();
      clearEditSession();
      setDraftEvent(createDraftFromSelection(arg.start, arg.end));
    },
    [clearEditSession]
  );

  const handleNavLinkDayClick = useCallback((date: Date) => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.changeView(MOBILE_DAY_VIEW, date);
  }, []);

  const handleDateClick = useCallback(() => {
    if (editSessionRef.current) {
      clearEditSession();
    }
  }, [clearEditSession]);

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      if (arg.event.extendedProps.type === 'draft') {
        const start = arg.event.start;
        const end = arg.event.end;

        if (!start || !end) {
          return;
        }

        openFormFromDraft({ start, end });
        return;
      }

      if (!isEditableStudyPlanEvent(arg.event.extendedProps)) {
        return;
      }

      const todoId = Number(arg.event.extendedProps.todoId);
      const todo = studyPlanTodos.find((item) => item.id === todoId);
      const occurrenceDate = String(arg.event.extendedProps.date ?? '');
      const eventId = String(arg.event.id);
      const start = arg.event.start;
      const end = arg.event.end;

      if (!todo || !occurrenceDate || !start || !end) {
        return;
      }

      const listView = isListCalendarView(arg.view.type);

      if (listView) {
        const occurrenceOnly = isOccurrenceOnlyStudyPlanEvent(
          arg.event.extendedProps,
          todoId,
          occurrenceDate,
          occurrenceOnlyKeysRef.current
        );

        if (todo.recurrenceType === 'weekly' && !occurrenceOnly) {
          setSelectedOccurrenceDate(occurrenceDate);
          setFormInitial(undefined);
          setSelectedTodo(todo);
          setEditingTodo(null);
          setChooserOpen(true);
          return;
        }

        openEditFormFromEvent(
          todo,
          occurrenceOnly ? 'occurrence' : 'once',
          occurrenceDate,
          start,
          end
        );
        return;
      }

      const activeSession = editSessionRef.current;
      const occurrenceOnly = isOccurrenceOnlyStudyPlanEvent(
        arg.event.extendedProps,
        todoId,
        occurrenceDate,
        occurrenceOnlyKeysRef.current
      );

      if (matchesStudyPlanEditSession(activeSession, eventId, todoId, occurrenceDate)) {
        const formOccurrenceDate =
          activeSession!.editScope === 'occurrence'
            ? activeSession!.occurrenceDate
            : occurrenceDate;

        openEditFormFromEvent(
          todo,
          activeSession!.editScope === 'occurrence' ? 'occurrence' : 'once',
          formOccurrenceDate,
          start,
          end
        );
        return;
      }

      if (activeSession) {
        setEditSession(null);
      }

      if (todo.recurrenceType === 'weekly' && !occurrenceOnly) {
        setSelectedOccurrenceDate(occurrenceDate);
        setFormInitial(undefined);
        setSelectedTodo(todo);
        setEditingTodo(null);
        setChooserOpen(true);
        return;
      }

      const editScope = occurrenceOnly ? 'occurrence' : 'once';
      if (editScope === 'occurrence') {
        occurrenceOnlyKeysRef.current.add(
          buildStudyPlanOccurrenceKey(todoId, occurrenceDate)
        );
      }

      startEditSession(eventId, todoId, editScope, occurrenceDate);
    },
    [openEditFormFromEvent, openFormFromDraft, startEditSession, studyPlanTodos]
  );

  const persistOnceDrag = useCallback(
    async (todo: StudyPlanTodo, start: Date, end: Date) => {
      const { date, startTime, endTime } = parseEventDateTimeRange(start, end);
      const timeError = validateScheduleTimeRange(startTime, endTime);

      if (timeError) {
        return { ok: false as const, error: timeError };
      }

      const res = await fetch(withStudent(`/api/study-plan-todos/${todo.id}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: todo.subject,
          title: todo.title,
          recurrenceType: 'once',
          date,
          startTime,
          endTime,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        return {
          ok: false as const,
          error: (data.error as string) ?? '스터디 플랜 수정에 실패했습니다.',
        };
      }

      const nextSession: StudyPlanEditSession = {
        eventId: buildStudyPlanEventId(todo.id, date),
        todoId: todo.id,
        editScope: 'once',
        occurrenceDate: date,
      };

      return { ok: true as const, session: nextSession };
    },
    [withStudent]
  );

  const persistOccurrenceDrag = useCallback(
    async (todo: StudyPlanTodo, fromDate: string, start: Date, end: Date) => {
      const { date, startTime, endTime } = parseEventDateTimeRange(start, end);
      const timeError = validateScheduleTimeRange(startTime, endTime);

      if (timeError) {
        return { ok: false as const, error: timeError };
      }

      const fields = resolveOccurrenceFields(todo, fromDate);

      if (date === fromDate) {
        const res = await fetch(
          withStudent(
            `/api/study-plan-todos/${todo.id}/occurrences/${fromDate}`
          ),
          {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: fields.title,
              startTime,
              endTime,
            }),
          }
        );
        const data = await res.json();

        if (!res.ok) {
          return {
            ok: false as const,
            error: (data.error as string) ?? '이 날짜 스터디 플랜 수정에 실패했습니다.',
          };
        }

        return {
          ok: true as const,
          session: {
            eventId: buildStudyPlanEventId(todo.id, fromDate),
            todoId: todo.id,
            editScope: 'occurrence' as const,
            occurrenceDate: fromDate,
          },
        };
      }

      const moveError = validateOccurrenceMoveTarget(todo, fromDate, date);
      if (moveError) {
        return { ok: false as const, error: moveError };
      }

      const res = await fetch(withStudent(`/api/study-plan-todos/${todo.id}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          buildWeeklyTodoMovePayload(todo, fromDate, date, {
            title: fields.title,
            startTime,
            endTime,
          })
        ),
      });
      const data = await res.json();

      if (!res.ok) {
        return {
          ok: false as const,
          error: (data.error as string) ?? '이 날짜 스터디 플랜 이동에 실패했습니다.',
        };
      }

      return {
        ok: true as const,
        session: {
          eventId: buildStudyPlanEventId(todo.id, date),
          todoId: todo.id,
          editScope: 'occurrence' as const,
          occurrenceDate: date,
        },
      };
    },
    [withStudent]
  );

  const handleEventChange = useCallback(
    async (arg: EventChangeArg) => {
      if (arg.event.extendedProps.type === 'draft') {
        const start = arg.event.start;
        const end = arg.event.end;

        if (!start || !end) {
          arg.revert();
          return;
        }

        setDraftEvent({ start, end });
        return;
      }

      const session = editSessionRef.current;
      const todoId = Number(arg.event.extendedProps.todoId);
      const occurrenceDate = String(arg.event.extendedProps.date ?? '');

      if (
        !session ||
        !matchesStudyPlanEditSession(
          session,
          String(arg.event.id),
          todoId,
          occurrenceDate
        ) ||
        !isEditableStudyPlanEvent(arg.event.extendedProps)
      ) {
        arg.revert();
        return;
      }

      if (savingDragRef.current) {
        arg.revert();
        return;
      }

      const start = arg.event.start;
      const end = arg.event.end;

      if (!start || !end) {
        arg.revert();
        return;
      }

      const todo = studyPlanTodos.find((item) => item.id === session.todoId);

      if (!todo) {
        arg.revert();
        setError('스터디 플랜을 찾을 수 없습니다.');
        return;
      }

      savingDragRef.current = true;
      setSavingDrag(true);
      setError('');

      try {
        const result =
          session.editScope === 'once'
            ? await persistOnceDrag(todo, start, end)
            : await persistOccurrenceDrag(todo, session.occurrenceDate, start, end);

        if (!result.ok) {
          arg.revert();
          setError(result.error);
          return;
        }

        if (result.session.editScope === 'occurrence') {
          occurrenceOnlyKeysRef.current.delete(
            buildStudyPlanOccurrenceKey(todo.id, session.occurrenceDate)
          );
          occurrenceOnlyKeysRef.current.add(
            buildStudyPlanOccurrenceKey(todo.id, result.session.occurrenceDate)
          );
        }

        clearEditSession();
        refreshCalendar();
      } catch {
        arg.revert();
        setError('스터디 플랜 수정에 실패했습니다.');
      } finally {
        savingDragRef.current = false;
        setSavingDrag(false);
      }
    },
    [
      clearEditSession,
      persistOccurrenceDrag,
      persistOnceDrag,
      refreshCalendar,
      studyPlanTodos,
    ]
  );

  const handleDeleteOccurrence = useCallback(async () => {
    if (!selectedTodo || !selectedOccurrenceDate) {
      return;
    }

    if (
      !confirm(
        `${formatOccurrenceDateLabel(selectedOccurrenceDate)} 스터디 플랜만 삭제할까요?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        withStudent(
          `/api/study-plan-todos/${selectedTodo.id}/occurrences/${selectedOccurrenceDate}`
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

      clearEditSession();
      closeAllModals();
      refreshCalendar();
    } catch {
      setError('이 날짜 스터디 플랜 삭제에 실패했습니다.');
    }
  }, [
    clearEditSession,
    closeAllModals,
    refreshCalendar,
    selectedOccurrenceDate,
    selectedTodo,
    withStudent,
  ]);

  const handleSaved = useCallback(() => {
    setDraftEvent(null);
    clearEditSession();
    refreshCalendar();
  }, [clearEditSession, refreshCalendar]);

  const editHint = useMemo(
    () =>
      buildCalendarEditHint({
        hasDraft: Boolean(draftEvent),
        editSession,
        formOpen,
        isMobile,
        isListView,
        entityName: '스터디 플랜',
        draftDescription:
          '드래그해 시간을 조정한 뒤, 클릭하여 스터디 플랜을 등록하세요.',
      }),
    [draftEvent, editSession, formOpen, isListView, isMobile]
  );

  const mobileHelpText = useMemo(() => {
    if (!isMobile) {
      return null;
    }

    if (isListView) {
      return '스터디 플랜을 탭하면 수정할 수 있습니다. + 버튼으로 추가하거나 일간 뷰에서 시간을 길게 탭하세요.';
    }

    if (editSession) {
      return '선택된 스터디 플랜을 길게 눌러 드래그하거나, 다시 탭해 수정하세요.';
    }

    return '스터디 플랜 입력 시 원하는 시간 영역을 길게 탭하세요.';
  }, [editSession, isListView, isMobile]);

  const showWeeklyPlanPanel = useMemo(() => {
    if (!visibleRange) {
      return false;
    }

    return isVisibleRangeInAnyWeeklyPlanPeriod(
      visibleRange,
      examPrepPlansContext,
      vacationPlansContext,
      regularPlansContext
    );
  }, [examPrepPlansContext, regularPlansContext, vacationPlansContext, visibleRange]);

  const handleWeeklyPlanPanelToggle = useCallback(() => {
    setWeeklyPlanPanelOpen((value) => !value);
  }, []);

  return (
    <div className="space-y-4">
      {(error || loadError) && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error || loadError}
        </div>
      )}

      <div className="study-plan-calendar-shell w-full">
        {showWeeklyPlanPanel && weeklyPlanPanelOpen && !isMobile ? (
          <WeeklyPlanPanel
            range={visibleRange}
            examContext={examPrepPlansContext}
            vacationContext={vacationPlansContext}
            regularContext={regularPlansContext}
            loading={examPrepPlansLoading || vacationPlansLoading || regularPlansLoading}
            collapsible={isMobile}
            defaultCollapsed={isMobile}
          />
        ) : null}

        <div
          ref={calendarContainerRef}
          className="study-plan-calendar-main relative study-plan-calendar schedule-calendar overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm max-[580px]:p-3 max-[480px]:p-2.5 max-[360px]:p-2 dark:border-neutral-800 dark:bg-zinc-900"
        >
          {(loading || savingDrag) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 text-sm text-gray-500 dark:bg-zinc-900/70 dark:text-gray-400">
              {savingDrag ? '스터디 플랜을 저장하는 중...' : '일정을 불러오는 중...'}
            </div>
          )}
          <CalendarEditHint key={editHint?.key ?? 'calendar-edit-hint'} hint={editHint} />
          <CalendarExamCountdownBadge
            containerRef={calendarContainerRef}
            countdown={countdown}
            toolbarVersion={toolbarVersion}
          />
          <CalendarWeeklyPlanToolbarToggle
            containerRef={calendarContainerRef}
            toolbarVersion={toolbarVersion}
            visible={showWeeklyPlanPanel && !isMobile}
            open={weeklyPlanPanelOpen}
            onToggle={handleWeeklyPlanPanelToggle}
          />
          {mobileHelpText ? (
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {mobileHelpText}
            </p>
          ) : null}
          <FullCalendar
            ref={calendarRef}
            plugins={CALENDAR_PLUGINS}
            initialView={resolveDefaultCalendarView(isMobile)}
            headerToolbar={isMobile ? MOBILE_HEADER_TOOLBAR : DESKTOP_HEADER_TOOLBAR}
            locale={calendarLocale}
            firstDay={1}
            events={calendarEvents}
            datesSet={handleDatesSet}
            dayHeaderClassNames={examPrepDayHeaderClassNames}
            dayHeaderContent={examPrepDayHeaderContent}
            navLinks={isMobile}
            navLinkDayClick={handleNavLinkDayClick}
            select={handleSelect}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventDidMount={handleEventDidMount}
            eventChange={handleEventChange}
            eventContent={renderEventContent}
            displayEventTime={isListView}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            slotMinTime={SLOT_MIN_TIME}
            slotMaxTime={SLOT_MAX_TIME}
            slotDuration="00:10:00"
            slotLabelInterval="00:30:00"
            snapDuration="00:10:00"
            allDaySlot
            allDaySlotHeight={ALL_DAY_SLOT_HEIGHT}
            height={isListView ? 'auto' : CALENDAR_HEIGHT}
            nowIndicator={!isListView}
            selectable={!isListView && !isMonthView && (!isMobile || isMobileDayView)}
            editable={!isListView && !isMonthView}
            eventStartEditable={!isListView && !isMonthView}
            eventDurationEditable={!isListView && !isMonthView}
            eventLongPressDelay={isMobileDayView ? 400 : 0}
            unselectAuto
          />
        </div>
      </div>

      {selectedTodo && selectedOccurrenceDate && (
        <StudyPlanOccurrenceChooser
          open={chooserOpen}
          todo={selectedTodo}
          occurrenceDate={selectedOccurrenceDate}
          onClose={closeAllModals}
          onEditOccurrence={() => {
            setChooserOpen(false);
            setSelectedTodo(null);
            occurrenceOnlyKeysRef.current.add(
              buildStudyPlanOccurrenceKey(selectedTodo.id, selectedOccurrenceDate)
            );
            startEditSession(
              buildStudyPlanEventId(selectedTodo.id, selectedOccurrenceDate),
              selectedTodo.id,
              'occurrence',
              selectedOccurrenceDate
            );
          }}
          onDeleteOccurrence={handleDeleteOccurrence}
          onEditSeries={() => {
            setEditingTodo(selectedTodo);
            setFormInitial(undefined);
            setChooserOpen(false);
            setSelectedTodo(null);
            setFormMode('series');
            setFormOpen(true);
          }}
        />
      )}

      <StudyPlanTodoForm
        open={formOpen}
        mode={formMode}
        todo={editingTodo}
        occurrenceDate={formMode === 'occurrence' ? selectedOccurrenceDate : undefined}
        initial={formInitial}
        onClose={handleFormClose}
        onSaved={handleSaved}
      />

      {isMobile && (
        <MobileFab label="스터디 플랜 추가" onClick={() => openCreateForm()} />
      )}
    </div>
  );
}
