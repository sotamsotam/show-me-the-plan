'use client';

import koLocale from '@fullcalendar/core/locales/ko';
import type {
  DateSelectArg,
  DatesSetArg,
  EventChangeArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNeisTimetableEnabled } from '@/hooks/useNeisTimetableEnabled';
import { useStudentApi } from '@/hooks/useStudentApi';
import { useUserSchedulesInRange } from '@/hooks/useUserSchedulesInRange';
import { invalidateUserSchedules } from '@/lib/dashboard-data-invalidation';
import { attachPerformanceBadgesToTimetableEvents } from '@/lib/performance-assessment';
import {
  buildOccurrenceKey,
  buildUserEventId,
  isOccurrenceOnlyUserEvent,
  matchesCalendarEditSession,
  type CalendarEditSession,
} from '@/lib/calendar-edit-session';
import {
  isAllDayCalendarEvent,
  isAllDayCalendarSelection,
  parseAllDayEventDateRange,
  parseEventDateTimeRange,
} from '@/lib/calendar-event-range';
import {
  ALL_DAY_END_TIME,
  ALL_DAY_START_TIME,
  validateScheduleTimeRange,
} from '@/lib/schedule-time';
import {
  buildOccurrenceDetachRequest,
} from '@/lib/user-schedule-occurrence';
import {
  formatOccurrenceDateLabel,
  resolveOccurrenceFields,
  type UserSchedule,
} from '@/lib/user-schedule';
import UserScheduleForm, {
  buildInitialFromSelection,
  buildInitialFromUserEvent,
  type UserScheduleFormInitial,
  type UserScheduleFormMode,
  type UserScheduleFormVariant,
} from '@/components/UserScheduleForm';
import { renderCalendarEventContent } from '@/components/calendar/CalendarEventContent';
import { useProfileSubjectsContext } from '@/contexts/ProfileSubjectsContext';
import UserScheduleOccurrenceChooser from '@/components/UserScheduleOccurrenceChooser';
import MobileFab from '@/components/MobileFab';
import CalendarEditHint from '@/components/calendar/CalendarEditHint';
import CalendarExamCountdownBadge from '@/components/calendar/CalendarExamCountdownBadge';
import { buildCalendarEditHint } from '@/lib/calendar-edit-hint';
import { useExamCountdown } from '@/hooks/useExamCountdown';
import { useMatchMedia } from '@/hooks/useIsMobile';
import { useResponsiveCalendarHeight } from '@/hooks/useResponsiveCalendarHeight';
import { useExamPrepDayHeader } from '@/hooks/useExamPrepDayHeader';
import type { VisibleDateRange } from '@/lib/exam-prep-visible-week-plans';
import {
  extractSchoolClassDates,
  extractSchoolHolidayEvents,
  resolveVacationPeriods,
} from '@/lib/school-term-periods';
import { isNeisSchoolCalendarEventType } from '@/lib/timetable';
import { scheduleScrollListWeekToToday } from '@/lib/calendar-list-week-scroll';

const CALENDAR_PLUGINS = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin];

const MOBILE_MEDIA_QUERY = '(max-width: 640px)';

const DESKTOP_HEADER_TOOLBAR = {
  left: 'prev,next today',
  center: 'title',
  right: 'dayGridMonth,timeGridWeek,timeGridDay',
} as const;

const MOBILE_HEADER_TOOLBAR = {
  left: 'listWeek,timeGridDay,dayGridMonth prev,next today',
  center: 'title',
  right: '',
} as const;

const MOBILE_LIST_VIEW = 'listWeek';
const MOBILE_DAY_VIEW = 'timeGridDay';
const MOBILE_MONTH_VIEW = 'dayGridMonth';
const DESKTOP_WEEK_VIEW = 'timeGridWeek';

const DRAFT_EVENT_ID = 'draft-schedule';
const DRAFT_DURATION_MS = 60 * 60 * 1000;

const SLOT_MIN_TIME = '05:00:00';
const SLOT_MAX_TIME = '28:00:00'; // 다음날 04:00

interface DraftSlot {
  start: Date;
  end: Date;
  allDay?: boolean;
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

function isEditableUserEvent(extendedProps: Record<string, unknown>): boolean {
  return extendedProps.type === 'user';
}

const SCHOOL_TIMETABLE_REFRESH_MESSAGE =
  '학교에서 공지한 시간표일정을 갱신하시겠습니까?\n일정이 맞지 않는 경우 갱신해 주세요.';

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

function draftToEventInput(draft: DraftSlot): EventInput {
  if (draft.allDay) {
    return {
      id: DRAFT_EVENT_ID,
      title: '새 일정',
      start: formatIsoDate(draft.start),
      end: formatIsoDate(draft.end),
      allDay: true,
      editable: true,
      durationEditable: false,
      classNames: ['draft-event', 'cal-event-card'],
      extendedProps: {
        type: 'draft',
      },
    };
  }

  return {
    id: DRAFT_EVENT_ID,
    title: '새 일정',
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

function createDraftFromSelection(
  start: Date,
  end: Date,
  viewType: string
): DraftSlot {
  if (viewType === 'dayGridMonth' && isAllDayCalendarSelection(start, end)) {
    return { start, end, allDay: true };
  }

  if (viewType !== 'dayGridMonth' && isAllDayCalendarSelection(start, end)) {
    return {
      start,
      end: new Date(start.getTime() + DRAFT_DURATION_MS),
    };
  }

  const selectedMs = end.getTime() - start.getTime();

  if (selectedMs < DRAFT_DURATION_MS) {
    return {
      start,
      end: new Date(start.getTime() + DRAFT_DURATION_MS),
    };
  }

  return { start, end };
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

export default function ScheduleCalendar() {
  const { withStudent, studentUserId } = useStudentApi();
  const { usesNeisTimetable, loading: neisProfileLoading } = useNeisTimetableEnabled();
  const { subjects: profileSubjects } = useProfileSubjectsContext();
  const renderEventContent = useCallback(
    (arg: EventContentArg) => renderCalendarEventContent(arg, profileSubjects),
    [profileSubjects]
  );
  const isMobile = useMatchMedia(MOBILE_MEDIA_QUERY);
  const [scheduleRange, setScheduleRange] = useState<{ start: string; end: string } | null>(
    null
  );
  const [timetableEvents, setTimetableEvents] = useState<EventInput[]>([]);
  const [draftEvent, setDraftEvent] = useState<DraftSlot | null>(null);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [timetableError, setTimetableError] = useState('');
  const [error, setError] = useState('');
  const {
    schedules: userSchedules,
    events: userScheduleEvents,
    isLoading: userSchedulesLoading,
    error: userSchedulesError,
    refetch: refetchUserSchedules,
  } = useUserSchedulesInRange({
    start: scheduleRange?.start ?? '',
    end: scheduleRange?.end ?? '',
    enabled: Boolean(scheduleRange),
  });
  const fetchedEvents = useMemo(
    () => [
      ...attachPerformanceBadgesToTimetableEvents(timetableEvents, userSchedules),
      ...userScheduleEvents,
    ],
    [timetableEvents, userScheduleEvents, userSchedules]
  );
  const loading = timetableLoading || userSchedulesLoading;
  const loadError = timetableError || userSchedulesError;
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<UserScheduleFormMode>('create');
  const [formVariant, setFormVariant] = useState<UserScheduleFormVariant>('default');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<UserSchedule | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<UserSchedule | null>(null);
  const [selectedOccurrenceDate, setSelectedOccurrenceDate] = useState('');
  const [formInitial, setFormInitial] = useState<UserScheduleFormInitial | undefined>();
  const [editSession, setEditSession] = useState<CalendarEditSession | null>(null);
  const [savingDrag, setSavingDrag] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const [toolbarVersion, setToolbarVersion] = useState(0);
  const [visibleRange, setVisibleRange] = useState<VisibleDateRange | null>(null);
  const [currentViewType, setCurrentViewType] = useState(DESKTOP_WEEK_VIEW);
  const { countdown, examPrepPeriods } = useExamCountdown({ visibleRange });
  const vacationPeriods = useMemo(
    () =>
      resolveVacationPeriods(
        extractSchoolHolidayEvents(fetchedEvents),
        extractSchoolClassDates(fetchedEvents)
      ),
    [fetchedEvents]
  );
  const { dayHeaderClassNames: examPrepDayHeaderClassNames, dayHeaderContent: examPrepDayHeaderContent } =
    useExamPrepDayHeader(examPrepPeriods, vacationPeriods);
  const fetchIdRef = useRef(0);
  const lastRangeKeyRef = useRef<string | null>(null);
  const currentRangeRef = useRef<{ start: Date; end: Date } | null>(null);
  const currentViewTypeRef = useRef(currentViewType);
  const editSessionRef = useRef<CalendarEditSession | null>(null);
  const savingDragRef = useRef(false);
  /** Weekly instances marked "this date only" before hasOverride is persisted. */
  const occurrenceOnlyKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    editSessionRef.current = editSession;
  }, [editSession]);

  useEffect(() => {
    currentViewTypeRef.current = currentViewType;
  }, [currentViewType]);

  useEffect(() => {
    savingDragRef.current = savingDrag;
  }, [savingDrag]);

  const clearEditSession = useCallback(() => {
    setEditSession(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !editSessionRef.current) {
        return;
      }

      const session = editSessionRef.current;
      if (session.editScope === 'occurrence') {
        occurrenceOnlyKeysRef.current.delete(
          buildOccurrenceKey(session.scheduleId, session.occurrenceDate)
        );
      }

      setEditSession(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
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

  const isListView = isListCalendarView(currentViewType);
  const isMonthView = currentViewType === MOBILE_MONTH_VIEW;
  const isMobileDayView = isMobileDayCalendarView(isMobile, currentViewType);
  const isMobileMonthEditDisabled = isMonthView && isMobile;
  const isTimeGridView = !isListView && !isMonthView;
  const usesMeasuredCalendarHeight = isTimeGridView || isListView;
  const calendarHeight = useResponsiveCalendarHeight(calendarContainerRef, {
    enabled: usesMeasuredCalendarHeight,
  });

  const calendarLocale = useMemo(
    () => ({
      ...koLocale,
      buttonText: {
        ...koLocale.buttonText,
        list: '주간',
        listWeek: '주간',
        timeGridDay: '일간',
        month: '월간',
        dayGridMonth: '월간',
      },
    }),
    []
  );

  const calendarEvents = useMemo(() => {
    const events = fetchedEvents.map((event) => {
      const props = (event.extendedProps ?? {}) as Record<string, unknown>;
      const scheduleId = Number(props.scheduleId);
      const occurrenceDate = String(props.date ?? '');

      if (
        !matchesCalendarEditSession(
          editSession,
          String(event.id ?? ''),
          scheduleId,
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

    const visibleEvents =
      currentViewType === 'dayGridMonth'
        ? events.filter(isAllDayCalendarEvent)
        : events;

    if (!draftEvent || isListView) {
      return visibleEvents;
    }

    return [...visibleEvents, draftToEventInput(draftEvent)];
  }, [fetchedEvents, draftEvent, editSession, currentViewType, isListView]);

  const fetchTimetableEvents = useCallback(
    async (start: Date, end: Date, options?: { refreshTimetable?: boolean }) => {
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

      if (options?.refreshTimetable) {
        params.set('refresh', 'true');
      }

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

  const refreshUserSchedules = useCallback(async () => {
    invalidateUserSchedules(studentUserId);
    // 캐시 무효화 알림으로 다른 훅(하단 네비 등)도 갱신. force 없이 in-flight 공유.
    await refetchUserSchedules(false);
  }, [refetchUserSchedules, studentUserId]);

  const refreshCalendar = useCallback(() => {
    lastRangeKeyRef.current = null;
    void refreshUserSchedules();
  }, [refreshUserSchedules]);

  const refreshSchoolTimetable = useCallback(() => {
    lastRangeKeyRef.current = null;
    if (currentRangeRef.current) {
      void fetchTimetableEvents(
        currentRangeRef.current.start,
        currentRangeRef.current.end,
        { refreshTimetable: true }
      );
    }
  }, [fetchTimetableEvents]);

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      setCurrentViewType(arg.view.type);
      setToolbarVersion((version) => version + 1);
      setVisibleRange({ start: arg.start, end: arg.end });

      if (isMobile && isListCalendarView(arg.view.type)) {
        scheduleScrollListWeekToToday(calendarContainerRef.current);
      }

      const rangeKey = buildRangeKey(arg);

      if (lastRangeKeyRef.current === rangeKey) {
        return;
      }

      lastRangeKeyRef.current = rangeKey;
      void fetchTimetableEvents(arg.start, arg.end);
    },
    [fetchTimetableEvents, isMobile]
  );

  const closeAllModals = useCallback(() => {
    setFormOpen(false);
    setChooserOpen(false);
    setEditingSchedule(null);
    setSelectedSchedule(null);
    setSelectedOccurrenceDate('');
    setFormInitial(undefined);
    setFormMode('create');
    setFormVariant('default');
  }, []);

  const handleFormClose = useCallback(() => {
    if (formMode === 'create') {
      setDraftEvent(null);
    }
    clearEditSession();
    closeAllModals();
  }, [formMode, closeAllModals, clearEditSession]);

  const openCreateForm = useCallback(
    (initial?: UserScheduleFormInitial, variant: UserScheduleFormVariant = 'default') => {
      clearEditSession();
      setEditingSchedule(null);
      setSelectedSchedule(null);
      setSelectedOccurrenceDate('');
      setChooserOpen(false);
      setFormInitial(initial);
      setFormMode('create');
      setFormVariant(variant);
      setFormOpen(true);
    },
    [clearEditSession]
  );

  const openMonthAllDayCreateForm = useCallback(
    (start: Date, end: Date) => {
      openCreateForm(buildInitialFromSelection(start, end), 'monthAllDay');
    },
    [openCreateForm]
  );

  const openMonthAllDayCreateFormForToday = useCallback(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    openMonthAllDayCreateForm(start, end);
  }, [openMonthAllDayCreateForm]);

  const handleMobileFabClick = useCallback(() => {
    if (isMonthView) {
      openMonthAllDayCreateFormForToday();
      return;
    }

    openCreateForm();
  }, [isMonthView, openCreateForm, openMonthAllDayCreateFormForToday]);

  const openFormFromDraft = useCallback(
    (draft: DraftSlot) => {
      if (draft.allDay) {
        openMonthAllDayCreateForm(draft.start, draft.end);
        return;
      }

      openCreateForm(buildInitialFromSelection(draft.start, draft.end));
    },
    [openCreateForm, openMonthAllDayCreateForm]
  );

  const startEditSession = useCallback(
    (
      eventId: string,
      scheduleId: number,
      editScope: CalendarEditSession['editScope'],
      occurrenceDate: string
    ) => {
      setEditSession({
        eventId,
        scheduleId,
        editScope,
        occurrenceDate,
      });
    },
    []
  );

  const openEditFormFromEvent = useCallback(
    (
      schedule: UserSchedule,
      mode: 'once' | 'occurrence',
      occurrenceDate: string,
      start: Date,
      end: Date | null
    ) => {
      setEditingSchedule(schedule);
      setSelectedOccurrenceDate(occurrenceDate);
      setFormInitial(buildInitialFromUserEvent(schedule, occurrenceDate, start, end));
      setFormMode(mode);
      setFormVariant(
        schedule.allDay && currentViewType === 'dayGridMonth' ? 'monthAllDay' : 'default'
      );
      setChooserOpen(false);
      setFormOpen(true);
    },
    [currentViewType]
  );

  const handleSelect = useCallback(
    (arg: DateSelectArg) => {
      if (isListCalendarView(arg.view.type)) {
        return;
      }

      arg.view.calendar.unselect();

      if (arg.allDay && arg.view.type !== 'dayGridMonth') {
        setError('종일 일정은 월간 일정표에서만 등록할 수 있습니다.');
        return;
      }

      clearEditSession();
      setError('');
      setDraftEvent(createDraftFromSelection(arg.start, arg.end, arg.view.type));
    },
    [clearEditSession]
  );

  const handleNavLinkDayClick = useCallback((date: Date) => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.changeView(MOBILE_DAY_VIEW, date);
  }, []);

  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      if (editSessionRef.current) {
        clearEditSession();
        return;
      }

      if (arg.view.type === 'dayGridMonth') {
        const start = arg.date;
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        openMonthAllDayCreateForm(start, end);
      }
    },
    [clearEditSession, openMonthAllDayCreateForm]
  );

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      if (arg.event.extendedProps.type === 'draft') {
        const start = arg.event.start;

        if (!start) {
          return;
        }

        if (arg.event.allDay) {
          if (currentViewTypeRef.current !== 'dayGridMonth') {
            setError('종일 일정은 월간 일정표에서만 등록할 수 있습니다.');
            return;
          }

          const end =
            arg.event.end ??
            (() => {
              const next = new Date(start);
              next.setDate(next.getDate() + 1);
              return next;
            })();
          openMonthAllDayCreateForm(start, end);
          return;
        }

        const end = arg.event.end;

        if (!end) {
          return;
        }

        openFormFromDraft({ start, end });
        return;
      }

      if (isNeisSchoolCalendarEventType(arg.event.extendedProps.type)) {
        if (!usesNeisTimetable) {
          return;
        }

        if (!confirm(SCHOOL_TIMETABLE_REFRESH_MESSAGE)) {
          return;
        }

        refreshSchoolTimetable();
        return;
      }

      if (!isEditableUserEvent(arg.event.extendedProps)) {
        return;
      }

      const scheduleId = Number(arg.event.extendedProps.scheduleId);
      const schedule = userSchedules.find((item) => item.id === scheduleId);
      const occurrenceDate = String(arg.event.extendedProps.date ?? '');
      const eventId = String(arg.event.id);
      const start = arg.event.start;

      if (!schedule || !occurrenceDate || !start) {
        return;
      }

      const listView = isListCalendarView(arg.view.type);

      if (listView) {
        const occurrenceOnly = isOccurrenceOnlyUserEvent(
          arg.event.extendedProps,
          scheduleId,
          occurrenceDate,
          occurrenceOnlyKeysRef.current
        );

        if (schedule.recurrenceType === 'weekly' && !occurrenceOnly) {
          setSelectedOccurrenceDate(occurrenceDate);
          setFormInitial(undefined);
          setSelectedSchedule(schedule);
          setEditingSchedule(null);
          setChooserOpen(true);
          return;
        }

        openEditFormFromEvent(
          schedule,
          occurrenceOnly ? 'occurrence' : 'once',
          occurrenceDate,
          start,
          arg.event.end
        );
        return;
      }

      if (schedule.allDay && currentViewTypeRef.current !== 'dayGridMonth') {
        setError('종일 일정은 월간 일정표에서만 수정할 수 있습니다.');
        return;
      }

      const activeSession = editSessionRef.current;
      const occurrenceOnly = isOccurrenceOnlyUserEvent(
        arg.event.extendedProps,
        scheduleId,
        occurrenceDate,
        occurrenceOnlyKeysRef.current
      );

      if (
        matchesCalendarEditSession(activeSession, eventId, scheduleId, occurrenceDate)
      ) {
        const formOccurrenceDate =
          activeSession!.editScope === 'occurrence'
            ? activeSession!.occurrenceDate
            : occurrenceDate;

        openEditFormFromEvent(
          schedule,
          activeSession!.editScope === 'occurrence' ? 'occurrence' : 'once',
          formOccurrenceDate,
          start,
          arg.event.end
        );
        return;
      }

      if (activeSession) {
        setEditSession(null);
      }

      if (schedule.recurrenceType === 'weekly' && !occurrenceOnly) {
        setSelectedOccurrenceDate(occurrenceDate);
        setFormInitial(undefined);
        setSelectedSchedule(schedule);
        setEditingSchedule(null);
        setChooserOpen(true);
        return;
      }

      const editScope = occurrenceOnly ? 'occurrence' : 'once';
      if (editScope === 'occurrence') {
        occurrenceOnlyKeysRef.current.add(
          buildOccurrenceKey(scheduleId, occurrenceDate)
        );
      }

      startEditSession(eventId, scheduleId, editScope, occurrenceDate);
    },
    [
      openEditFormFromEvent,
      openFormFromDraft,
      openMonthAllDayCreateForm,
      refreshSchoolTimetable,
      startEditSession,
      userSchedules,
      usesNeisTimetable,
    ]
  );

  const handleDeleteOccurrence = useCallback(async () => {
    if (!selectedSchedule || !selectedOccurrenceDate) {
      return;
    }

    if (
      !confirm(
        `${formatOccurrenceDateLabel(selectedOccurrenceDate)} 일정만 삭제할까요?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        withStudent(
          `/api/user-schedules/${selectedSchedule.id}/occurrences/${selectedOccurrenceDate}`
        ),
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '이 날짜 일정 삭제에 실패했습니다.');
        return;
      }

      clearEditSession();
      closeAllModals();
      refreshCalendar();
    } catch {
      setError('이 날짜 일정 삭제에 실패했습니다.');
    }
  }, [
    clearEditSession,
    closeAllModals,
    refreshCalendar,
    selectedOccurrenceDate,
    selectedSchedule,
    withStudent,
  ]);

  const persistOnceDrag = useCallback(
    async (schedule: UserSchedule, start: Date, end: Date | null) => {
      if (schedule.allDay) {
        const { date, endDate } = parseAllDayEventDateRange(start, end);

        const res = await fetch(withStudent(`/api/user-schedules/${schedule.id}`), {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: schedule.title,
            scheduleCategory: schedule.scheduleCategory,
            recurrenceType: 'once',
            allDay: true,
            date,
            endDate,
            startTime: ALL_DAY_START_TIME,
            endTime: ALL_DAY_END_TIME,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          return {
            ok: false as const,
            error: (data.error as string) ?? '일정 수정에 실패했습니다.',
          };
        }

        const nextSession: CalendarEditSession = {
          eventId: buildUserEventId(schedule.id, date),
          scheduleId: schedule.id,
          editScope: 'once',
          occurrenceDate: date,
        };

        return { ok: true as const, session: nextSession };
      }

      if (!end) {
        return { ok: false as const, error: '일정 종료 시각이 없습니다.' };
      }

      const { date, startTime, endTime } = parseEventDateTimeRange(start, end);
      const timeError = validateScheduleTimeRange(startTime, endTime);

      if (timeError) {
        return { ok: false as const, error: timeError };
      }

      const res = await fetch(withStudent(`/api/user-schedules/${schedule.id}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: schedule.title,
          scheduleCategory: schedule.scheduleCategory,
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
          error: (data.error as string) ?? '일정 수정에 실패했습니다.',
        };
      }

      const nextSession: CalendarEditSession = {
        eventId: buildUserEventId(schedule.id, date),
        scheduleId: schedule.id,
        editScope: 'once',
        occurrenceDate: date,
      };

      return { ok: true as const, session: nextSession };
    },
    [withStudent]
  );

  const persistOccurrenceDrag = useCallback(
    async (
      schedule: UserSchedule,
      fromDate: string,
      start: Date,
      end: Date
    ) => {
      const { date, startTime, endTime } = parseEventDateTimeRange(start, end);
      const timeError = validateScheduleTimeRange(startTime, endTime);

      if (timeError) {
        return { ok: false as const, error: timeError };
      }

      const fields = resolveOccurrenceFields(schedule, fromDate);

      if (date === fromDate) {
        const res = await fetch(
          withStudent(
            `/api/user-schedules/${schedule.id}/occurrences/${fromDate}`
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
            error: (data.error as string) ?? '이 날짜 일정 수정에 실패했습니다.',
          };
        }

        return {
          ok: true as const,
          session: {
            eventId: buildUserEventId(schedule.id, fromDate),
            scheduleId: schedule.id,
            editScope: 'occurrence' as const,
            occurrenceDate: fromDate,
          },
        };
      }

      const res = await fetch(
        withStudent(`/api/user-schedules/${schedule.id}/occurrences/${fromDate}/detach`),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            buildOccurrenceDetachRequest(schedule, fromDate, date, startTime, endTime)
          ),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        return {
          ok: false as const,
          error: (data.error as string) ?? '이 날짜 일정 분리에 실패했습니다.',
        };
      }

      return { ok: true as const };
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
      const scheduleId = Number(arg.event.extendedProps.scheduleId);
      const occurrenceDate = String(arg.event.extendedProps.date ?? '');

      if (
        !session ||
        !matchesCalendarEditSession(
          session,
          String(arg.event.id),
          scheduleId,
          occurrenceDate
        ) ||
        !isEditableUserEvent(arg.event.extendedProps)
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

      if (!start) {
        arg.revert();
        return;
      }

      const schedule = userSchedules.find((item) => item.id === session.scheduleId);

      if (!schedule) {
        arg.revert();
        setError('일정을 찾을 수 없습니다.');
        return;
      }

      if (!schedule.allDay && !end) {
        arg.revert();
        return;
      }

      savingDragRef.current = true;
      setSavingDrag(true);
      setError('');

      try {
        const result =
          session.editScope === 'once'
            ? await persistOnceDrag(schedule, start, end)
            : await persistOccurrenceDrag(
                schedule,
                session.occurrenceDate,
                start,
                end!
              );

        if (!result.ok) {
          arg.revert();
          setError(result.error);
          return;
        }

        if ('session' in result && result.session) {
          if (result.session.editScope === 'occurrence') {
            occurrenceOnlyKeysRef.current.delete(
              buildOccurrenceKey(schedule.id, session.occurrenceDate)
            );
            occurrenceOnlyKeysRef.current.add(
              buildOccurrenceKey(schedule.id, result.session.occurrenceDate)
            );
          }
        } else {
          occurrenceOnlyKeysRef.current.delete(
            buildOccurrenceKey(schedule.id, session.occurrenceDate)
          );
        }

        clearEditSession();
        refreshCalendar();
      } catch {
        arg.revert();
        setError('일정 수정에 실패했습니다.');
      } finally {
        savingDragRef.current = false;
        setSavingDrag(false);
      }
    },
    [clearEditSession, persistOccurrenceDrag, persistOnceDrag, refreshCalendar, userSchedules]
  );

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
        entityName: '일정',
        draftDescription: '드래그해 시간을 조정한 뒤, 클릭하여 등록하세요.',
      }),
    [draftEvent, editSession, formOpen, isListView, isMobile]
  );

  const mobileHelpText = useMemo(() => {
    if (!isMobile) {
      return null;
    }

    if (isMonthView) {
      return '날짜를 탭하거나 + 버튼으로 종일 일정을 추가할 수 있습니다. 일정을 탭하면 수정할 수 있습니다.';
    }

    if (isListView) {
      return '일정을 탭하면 수정할 수 있습니다. 새 일정은 일간 뷰에서 추가하세요.';
    }

    if (editSession) {
      return '선택된 일정을 길게 눌러 드래그하거나, 다시 탭해 수정하세요.';
    }

    return '일정 입력 시 원하는 시간 영역을 길게 탭하세요.';
  }, [editSession, isListView, isMobile, isMonthView]);

  useEffect(() => {
    if (!usesMeasuredCalendarHeight || calendarHeight === 'auto') {
      return;
    }

    calendarRef.current?.getApi().updateSize();
  }, [calendarHeight, usesMeasuredCalendarHeight]);

  // 일정 로드 후 리스트 DOM이 갱신되면 오늘 행으로 다시 맞춘다.
  useEffect(() => {
    if (!isMobile || !isListView || loading) {
      return;
    }

    scheduleScrollListWeekToToday(calendarContainerRef.current);
  }, [calendarEvents, isListView, isMobile, loading, calendarHeight]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {(error || loadError) && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error || loadError}
        </div>
      )}

      <div
        ref={calendarContainerRef}
        className={`relative schedule-calendar w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm max-[580px]:p-3 max-[480px]:p-2.5 max-[360px]:p-2 dark:border-neutral-800 dark:bg-zinc-900${
          usesMeasuredCalendarHeight ? ' flex min-h-0 flex-1 flex-col' : ''
        }${isMonthView ? ' schedule-calendar--month' : ''}`}
      >
        {(loading || savingDrag) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 text-sm text-gray-500 dark:bg-zinc-900/70 dark:text-gray-400">
            {savingDrag ? '일정을 저장하는 중...' : '일정을 불러오는 중...'}
          </div>
        )}
        <CalendarEditHint key={editHint?.key ?? 'calendar-edit-hint'} hint={editHint} />
        <CalendarExamCountdownBadge
          containerRef={calendarContainerRef}
          countdown={countdown}
          toolbarVersion={toolbarVersion}
        />
        {mobileHelpText ? (
          <p
            data-calendar-help
            className="mb-3 text-sm text-gray-500 dark:text-gray-400"
          >
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
          selectAllow={(selectInfo) =>
            !selectInfo.allDay || currentViewTypeRef.current === 'dayGridMonth'
          }
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventChange={handleEventChange}
          eventContent={renderEventContent}
          displayEventTime={isListView}
          eventTimeFormat={
            isListView
              ? {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }
              : {
                  hour: 'numeric',
                  minute: '2-digit',
                  meridiem: 'short',
                }
          }
          slotMinTime={SLOT_MIN_TIME}
          slotMaxTime={SLOT_MAX_TIME}
          slotDuration="00:10:00"
          slotLabelInterval="00:30:00"
          snapDuration="00:10:00"
          allDaySlot
          height={calendarHeight}
          dayMaxEvents={false}
          dayMaxEventRows={isMonthView ? false : undefined}
          nowIndicator={!isListView && !isMonthView}
          selectable={!isListView && !isMonthView && (!isMobile || isMobileDayView)}
          editable={!isListView && !isMobileMonthEditDisabled}
          eventStartEditable={!isListView && !isMobileMonthEditDisabled}
          eventDurationEditable={!isListView && !isMobileMonthEditDisabled}
          eventLongPressDelay={isMobileDayView ? 400 : 0}
          unselectAuto
        />
      </div>

      {selectedSchedule && selectedOccurrenceDate && (
        <UserScheduleOccurrenceChooser
          open={chooserOpen}
          schedule={selectedSchedule}
          occurrenceDate={selectedOccurrenceDate}
          onClose={closeAllModals}
          onEditOccurrence={() => {
            setChooserOpen(false);
            setSelectedSchedule(null);
            occurrenceOnlyKeysRef.current.add(
              buildOccurrenceKey(selectedSchedule.id, selectedOccurrenceDate)
            );
            startEditSession(
              buildUserEventId(selectedSchedule.id, selectedOccurrenceDate),
              selectedSchedule.id,
              'occurrence',
              selectedOccurrenceDate
            );
          }}
          onDeleteOccurrence={handleDeleteOccurrence}
          onEditSeries={() => {
            setEditingSchedule(selectedSchedule);
            setFormInitial(undefined);
            setChooserOpen(false);
            setSelectedSchedule(null);
            setFormMode('series');
            setFormOpen(true);
          }}
        />
      )}

      <UserScheduleForm
        open={formOpen}
        mode={formMode}
        variant={formVariant}
        schedule={editingSchedule}
        occurrenceDate={
          formMode === 'occurrence' ? selectedOccurrenceDate : undefined
        }
        initial={formInitial}
        onClose={handleFormClose}
        onSaved={handleSaved}
      />

      {isMobile && (
        <MobileFab label="일정 추가" onClick={handleMobileFabClick} />
      )}
    </div>
  );
}
