'use client';

import type { EventContentArg } from '@fullcalendar/core';
import ExecutionStatusCheckbox from '@/components/ExecutionStatusCheckbox';
import ScheduleAttachmentViewer from '@/components/ScheduleAttachmentViewer';
import { readEventAttachments } from '@/lib/schedule-attachment';
import type { PerformanceAssessmentBadge } from '@/lib/performance-assessment';
import type { CheckboxVisualState, StudyPlanSubject } from '@/lib/study-plan-todo';
import { formatStudyPlanEventTitle, getSubjectLabel } from '@/lib/study-plan-todo';
import type { ProfileSubjectsInput } from '@/lib/user-subject';
import {
  formatUserScheduleListTitle,
  type ScheduleCategory,
} from '@/lib/user-schedule';

function readPerformanceAssessment(
  arg: EventContentArg
): PerformanceAssessmentBadge | null {
  const value = arg.event.extendedProps.performanceAssessment as
    | PerformanceAssessmentBadge
    | undefined;
  return value ?? null;
}
const EVENT_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatEventTimeText(start: Date, end: Date): string {
  return `${EVENT_TIME_FORMATTER.format(start)} - ${EVENT_TIME_FORMATTER.format(end)}`;
}

function isAllDayEvent(arg: EventContentArg): boolean {
  if (arg.event.allDay) {
    return true;
  }

  const props = arg.event.extendedProps as Record<string, unknown>;
  if (props.allDay) {
    return true;
  }

  const type = props.type;
  return type === 'school-exam' || type === 'school-holiday';
}

function resolveEventTimeText(arg: EventContentArg): string {
  if (isAllDayEvent(arg)) {
    return '';
  }

  const { start, end } = arg.event;
  const type = arg.event.extendedProps.type as string | undefined;

  if (!start || !end) {
    return '';
  }

  if (type === 'study-plan') {
    return formatEventTimeText(start, end);
  }

  if (arg.timeText) {
    return arg.timeText;
  }

  return formatEventTimeText(start, end);
}

function getDurationMinutes(arg: EventContentArg): number {
  const { start, end } = arg.event;

  if (!start || !end) {
    return 0;
  }

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function isBackgroundScheduleEvent(arg: EventContentArg): boolean {
  return (
    arg.event.display === 'background' ||
    Boolean(arg.event.extendedProps.isScheduleBackground)
  );
}

function resolveDisplayTitle(arg: EventContentArg): string {
  const { event } = arg;
  const type = event.extendedProps.type as string | undefined;

  if (type === 'school') {
    return event.title;
  }

  if (type === 'school-exam' || type === 'school-holiday') {
    return event.title;
  }

  if (type === 'study-plan') {
    const todoTitle = event.extendedProps.title as string | undefined;
    return todoTitle || event.title;
  }

  if (type === 'draft') {
    return event.title || '새 일정';
  }

  return event.title;
}

function resolveStudyPlanSubject(arg: EventContentArg): StudyPlanSubject | undefined {
  const subject = arg.event.extendedProps.subject as StudyPlanSubject | undefined;
  return subject;
}

function resolveListDisplayTitle(
  arg: EventContentArg,
  subjects?: ProfileSubjectsInput
): string {
  const type = arg.event.extendedProps.type as string | undefined;

  if (type === 'study-plan') {
    const todoTitle = arg.event.extendedProps.title as string | undefined;
    const subject = resolveStudyPlanSubject(arg);

    if (subject && todoTitle) {
      return formatStudyPlanEventTitle(subject, todoTitle, subjects);
    }

    return todoTitle || arg.event.title;
  }

  if (type === 'user') {
    const scheduleCategory = arg.event.extendedProps.scheduleCategory as
      | ScheduleCategory
      | undefined;

    if (scheduleCategory) {
      return formatUserScheduleListTitle(arg.event.title, scheduleCategory);
    }

    return arg.event.title;
  }

  if (type === 'school') {
    return arg.event.title;
  }

  return resolveDisplayTitle(arg);
}

function buildStudyPlanEventTooltip(
  timeText: string,
  subjectLabel: string | null,
  title: string
): string {
  return [timeText, subjectLabel, title].filter(Boolean).join(' · ');
}

type StudyPlanLayoutTier = 'full' | 'compact' | 'minimal';

function getStudyPlanLayoutTier(durationMin: number): StudyPlanLayoutTier {
  if (durationMin <= 0) {
    return 'full';
  }

  if (durationMin <= 10) {
    return 'minimal';
  }

  if (durationMin <= 20) {
    return 'compact';
  }

  return 'full';
}

function resolveStudyPlanExecutionStatus(arg: EventContentArg): CheckboxVisualState {
  const status = arg.event.extendedProps.executionStatus;

  if (
    status === 'completed' ||
    status === 'partial' ||
    status === 'incomplete' ||
    status === 'pending'
  ) {
    return status;
  }

  return 'pending';
}

function StudyPlanSubjectWithStatus({
  subjectLabel,
  executionStatus,
  subjectClassName,
  inline = false,
  timeText,
}: {
  subjectLabel: string;
  executionStatus: CheckboxVisualState;
  subjectClassName: string;
  inline?: boolean;
  timeText?: string;
}) {
  return (
    <span className={`cal-event-subject-row${inline ? ' cal-event-subject-row--inline' : ''}`}>
      <ExecutionStatusCheckbox
        status={executionStatus}
        size="xs"
        className="cal-event-execution-icon"
      />
      <span
        className={
          inline
            ? 'cal-event-subject cal-event-subject--inline'
            : subjectClassName
        }
      >
        {subjectLabel}
      </span>
      {timeText ? (
        <span className="cal-event-time cal-event-time--inline">{timeText}</span>
      ) : null}
    </span>
  );
}

function buildStudyPlanInnerClassName(tier: StudyPlanLayoutTier): string {
  const classes = ['cal-event-inner', 'cal-event-inner--study-plan'];

  if (tier === 'compact' || tier === 'minimal') {
    classes.push('cal-event-inner--study-plan-short');
    classes.push('cal-event-inner--study-plan-compact');
  }

  if (tier === 'minimal') {
    classes.push('cal-event-inner--study-plan-minimal');
  }

  return classes.join(' ');
}

export function renderCalendarEventContent(
  arg: EventContentArg,
  subjects?: ProfileSubjectsInput
) {
  const isListView = arg.view.type.startsWith('list');
  const durationMin = getDurationMinutes(arg);
  const isMonthView = arg.view.type === 'dayGridMonth';
  const isBackground = isBackgroundScheduleEvent(arg);
  const isMinimal = !isMonthView && !isBackground && durationMin > 0 && durationMin < 15;
  const isCompact =
    isMonthView || isBackground || (durationMin > 0 && durationMin < 25);

  const title = resolveDisplayTitle(arg);
  const period = arg.event.extendedProps.period as number | undefined;
  const timeText = resolveEventTimeText(arg);
  const studyPlanSubject = resolveStudyPlanSubject(arg);
  const type = arg.event.extendedProps.type as string | undefined;

  if (isBackground) {
    return (
      <div className="cal-bg-event-inner">
        <span className="cal-bg-event-label">{title}</span>
      </div>
    );
  }

  if (type === 'performance-photo') {
    const performance = readPerformanceAssessment(arg);
    if (!performance || performance.attachments.length === 0) {
      return null;
    }

    const subjectLabel =
      (arg.event.extendedProps.subjectLabel as string | undefined)?.trim() ||
      performance.linkedSubject?.trim() ||
      '과목';

    return (
      <div
        className="cal-event-inner cal-event-inner--performance-photo"
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
      >
        <span className="cal-performance-photo-subject">{subjectLabel}</span>
        <span className="cal-event-performance-label">수행평가</span>
        <ScheduleAttachmentViewer
          event={{
            id: String(arg.event.id),
            title: performance.title,
            extendedProps: { attachments: performance.attachments },
          }}
          title={performance.title}
          variant="badge"
          badgeClassName="performance-photo-overlay-badge"
        />
      </div>
    );
  }

  if (isMonthView) {
    if (type === 'user') {
      const eventInput = {
        id: String(arg.event.id),
        title: arg.event.title,
        extendedProps: { ...arg.event.extendedProps },
      };

      if (readEventAttachments(eventInput).length > 0) {
        return (
          <ScheduleAttachmentViewer
            event={eventInput}
            title={title}
            variant="calendar"
            calendarInnerClassName="cal-event-inner--month"
            calendarTriggerMode="stacked"
          />
        );
      }
    }

    return (
      <div className="cal-event-inner cal-event-inner--month">
        <span className="cal-event-title">{title}</span>
      </div>
    );
  }

  if (isAllDayEvent(arg)) {
    if (type === 'user') {
      const eventInput = {
        id: String(arg.event.id),
        title: arg.event.title,
        extendedProps: { ...arg.event.extendedProps },
      };

      if (readEventAttachments(eventInput).length > 0) {
        return (
          <ScheduleAttachmentViewer
            event={eventInput}
            title={title}
            variant="calendar"
          />
        );
      }
    }

    return (
      <div className="cal-event-inner cal-event-inner--allday">
        <span className="cal-event-title">{title}</span>
      </div>
    );
  }

  if (isListView) {
    const listTitle = resolveListDisplayTitle(arg, subjects);
    const executionStatus =
      type === 'study-plan' ? resolveStudyPlanExecutionStatus(arg) : null;
    const performance = type === 'school' ? readPerformanceAssessment(arg) : null;
    const attachmentEvent = performance
      ? {
          id: String(arg.event.id),
          title: performance.title,
          extendedProps: { attachments: performance.attachments },
        }
      : null;

    return (
      <div className="cal-event-inner cal-event-inner--list">
        {executionStatus ? (
          <span className="cal-event-list-row">
            <ExecutionStatusCheckbox
              status={executionStatus}
              size="xs"
              className="cal-event-execution-icon"
            />
            <span className="cal-event-title cal-event-title--wrap">{listTitle}</span>
          </span>
        ) : (
          <span className="cal-event-list-row">
            <span className="cal-event-title cal-event-title--wrap">{listTitle}</span>
            {attachmentEvent && performance.attachments.length > 0 ? (
              <ScheduleAttachmentViewer
                event={attachmentEvent}
                title={performance.title}
                variant="badge"
              />
            ) : null}
          </span>
        )}
      </div>
    );
  }

  if (isMinimal && type !== 'study-plan') {
    return (
      <div className="cal-event-inner cal-event-inner--minimal" title={timeText || title}>
        <span className="cal-event-title cal-event-title--truncate">{title}</span>
      </div>
    );
  }

  if (type === 'study-plan') {
    const subjectLabel = studyPlanSubject
      ? getSubjectLabel(studyPlanSubject, subjects)
      : null;
    const executionStatus = resolveStudyPlanExecutionStatus(arg);
    const layoutTier = getStudyPlanLayoutTier(durationMin);
    const showTimeInline = layoutTier === 'full' && Boolean(timeText);
    const tooltip = buildStudyPlanEventTooltip(timeText, subjectLabel, title);
    const innerClassName = buildStudyPlanInnerClassName(layoutTier);
    const subjectClassName =
      layoutTier === 'compact'
        ? 'cal-event-subject cal-event-subject--compact'
        : 'cal-event-subject';

    if (layoutTier === 'minimal') {
      return (
        <div className={innerClassName} title={tooltip}>
          <div className="cal-event-inline">
            {subjectLabel ? (
              <StudyPlanSubjectWithStatus
                subjectLabel={subjectLabel}
                executionStatus={executionStatus}
                subjectClassName={subjectClassName}
                inline
              />
            ) : (
              <ExecutionStatusCheckbox
                status={executionStatus}
                size="xs"
                className="cal-event-execution-icon"
              />
            )}
            {subjectLabel && title ? (
              <span className="cal-event-inline-sep" aria-hidden="true">
                ·
              </span>
            ) : null}
            <span className="cal-event-title cal-event-title--truncate">{title}</span>
          </div>
        </div>
      );
    }

    return (
      <div className={innerClassName} title={layoutTier === 'full' ? undefined : tooltip}>
        {subjectLabel ? (
          <StudyPlanSubjectWithStatus
            subjectLabel={subjectLabel}
            executionStatus={executionStatus}
            subjectClassName={subjectClassName}
            timeText={showTimeInline ? timeText : undefined}
          />
        ) : null}
        <div
          className={
            layoutTier === 'compact'
              ? 'cal-event-title cal-event-title--wrap cal-event-title--clamp-2'
              : 'cal-event-title cal-event-title--wrap'
          }
        >
          {title}
        </div>
      </div>
    );
  }

  const schoolPerformance = type === 'school' ? readPerformanceAssessment(arg) : null;

  return (
    <div className="cal-event-inner">
      <div className="cal-event-title">
        {title}
        {schoolPerformance ? (
          <span className="cal-event-performance-label"> 수행평가</span>
        ) : null}
      </div>
      {!isCompact && timeText ? (
        <div className="cal-event-time">{timeText}</div>
      ) : null}
      {!isCompact && type === 'school' && period ? (
        <div className="cal-event-meta">{period}교시</div>
      ) : null}
      {schoolPerformance && schoolPerformance.attachments.length > 0 ? (
        <ScheduleAttachmentViewer
          event={{
            id: String(arg.event.id),
            title: schoolPerformance.title,
            extendedProps: {
              attachments: schoolPerformance.attachments,
            },
          }}
          title={schoolPerformance.title}
          variant="badge"
        />
      ) : null}
    </div>
  );
}
