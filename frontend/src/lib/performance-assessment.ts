import type { EventInput } from '@fullcalendar/core';

import type { ScheduleAttachment, UserSchedule } from '@/lib/user-schedule';
import { isPerformanceAssessment } from '@/lib/user-schedule';

export interface PerformanceAssessmentBadge {
  scheduleId: number;
  title: string;
  linkedSubject: string | null;
  linkedPeriod: number | null;
  attachments: ScheduleAttachment[];
}

export function filterPerformanceAssessments(
  schedules: UserSchedule[]
): UserSchedule[] {
  return schedules.filter((schedule) => isPerformanceAssessment(schedule));
}

/** 오늘 포함 이후 수행평가 일정 개수 (지난 일정 제외) */
export function countUpcomingPerformanceAssessments(
  schedules: UserSchedule[],
  today: string
): number {
  return filterPerformanceAssessments(schedules).filter((item) => {
    if (!item.date) {
      return false;
    }
    return item.date >= today;
  }).length;
}

export function filterNonPerformanceSchedules(
  schedules: UserSchedule[]
): UserSchedule[] {
  return schedules.filter((schedule) => !isPerformanceAssessment(schedule));
}

function eventDateKey(event: EventInput): string | null {
  const fromProps = event.extendedProps?.date;
  if (typeof fromProps === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fromProps)) {
    return fromProps;
  }

  const start = event.start;
  if (typeof start === 'string') {
    return start.slice(0, 10);
  }

  if (start instanceof Date && !Number.isNaN(start.getTime())) {
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, '0');
    const d = String(start.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

export function matchPerformanceAssessment(
  assessments: UserSchedule[],
  date: string,
  period: number | undefined,
  subjectLabel?: string
): UserSchedule | undefined {
  const onDate = assessments.filter(
    (item) => isPerformanceAssessment(item) && item.date === date
  );

  if (onDate.length === 0) {
    return undefined;
  }

  if (period != null) {
    const byPeriod = onDate.find((item) => item.linkedPeriod === period);
    if (byPeriod) {
      return byPeriod;
    }
  }

  if (subjectLabel) {
    const normalized = subjectLabel.trim();
    return onDate.find(
      (item) =>
        item.linkedPeriod == null &&
        (item.linkedSubject ?? '').trim() === normalized
    );
  }

  return undefined;
}

export function attachPerformanceBadgesToTimetableEvents(
  events: EventInput[],
  schedules: UserSchedule[]
): EventInput[] {
  const assessments = filterPerformanceAssessments(schedules);

  if (assessments.length === 0) {
    return events;
  }

  return events.map((event) => {
    if (event.extendedProps?.type !== 'school') {
      return event;
    }

    const date = eventDateKey(event);
    const period = event.extendedProps.period as number | undefined;

    if (!date) {
      return event;
    }

    const matched = matchPerformanceAssessment(
      assessments,
      date,
      period,
      event.title
    );

    if (!matched) {
      return event;
    }

    const badge: PerformanceAssessmentBadge = {
      scheduleId: matched.id,
      title: matched.title,
      linkedSubject: matched.linkedSubject ?? null,
      linkedPeriod: matched.linkedPeriod ?? null,
      attachments: matched.attachments ?? [],
    };

    return {
      ...event,
      classNames: [
        ...(Array.isArray(event.classNames) ? event.classNames : []),
        'school-event--performance',
      ],
      extendedProps: {
        ...event.extendedProps,
        performanceAssessment: badge,
        attachments:
          badge.attachments.length > 0
            ? badge.attachments
            : event.extendedProps?.attachments,
      },
    };
  });
}

const PERFORMANCE_PHOTO_OVERLAY_MS = 15 * 60 * 1000;

function resolveEventStartDate(event: EventInput): Date | null {
  const start = event.start;
  if (start instanceof Date && !Number.isNaN(start.getTime())) {
    return start;
  }

  if (typeof start === 'string') {
    const parsed = new Date(start);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/** 공부일정 배경 교시 위에서 클릭 가능한 수행평가 사진 오버레이 */
export function buildPerformancePhotoOverlayEvents(
  events: EventInput[]
): EventInput[] {
  const overlays: EventInput[] = [];

  for (const event of events) {
    const props = event.extendedProps as Record<string, unknown> | undefined;
    if (props?.type !== 'school' || event.allDay) {
      continue;
    }

    const badge = props.performanceAssessment as PerformanceAssessmentBadge | undefined;
    if (!badge || badge.attachments.length === 0) {
      continue;
    }

    const start = resolveEventStartDate(event);
    if (!start) {
      continue;
    }

    overlays.push({
      id: `${event.id}-perf-photo`,
      title: badge.title,
      start,
      end: new Date(start.getTime() + PERFORMANCE_PHOTO_OVERLAY_MS),
      editable: false,
      classNames: ['performance-photo-overlay', 'cal-event-card'],
      extendedProps: {
        type: 'performance-photo',
        subjectLabel:
          badge.linkedSubject?.trim() ||
          (typeof event.title === 'string' ? event.title.trim() : '') ||
          '과목',
        performanceAssessment: badge,
        attachments: badge.attachments,
      },
    });
  }

  return overlays;
}
