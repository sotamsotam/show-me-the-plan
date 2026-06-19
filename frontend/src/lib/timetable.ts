import type { EventInput } from '@fullcalendar/core';
import { subjectClassName } from '@/lib/calendar-design-tokens';
import { resolveSchoolSubject } from '@/lib/resolve-school-subject';
import { getPeriodTimes, isSaturdayYmd, ymdToIsoDate } from './period-times';

export interface TimetableEntry {
  date: string;
  period: number;
  subject: string;
}

export interface SchoolExamEvent {
  date: string;
  title: string;
  description?: string;
  category: string;
}

export type SchoolScheduleEventKind = 'exam' | 'holiday';

export interface SchoolScheduleEvent extends SchoolExamEvent {
  kind: SchoolScheduleEventKind;
}

export interface TimetableProfile {
  schoolName: string;
  grade: string;
  className: string;
  schoolLevel: string;
}

/** 학사일정은 FullCalendar 종일 슬롯(allDaySlot)에 표시 */
const HOLIDAY_SUBJECT_PATTERN =
  /휴업|공휴|선거|방학|개교기념일|임시휴업|재량|원격수업|코로나|설날|추석|현충일|광복절|개천절|한글날|어린이날|성탄절|크리스마스/i;

function isHolidaySubject(subject: string): boolean {
  return HOLIDAY_SUBJECT_PATTERN.test(subject);
}

export function entriesToCalendarEvents(
  entries: TimetableEntry[],
  schoolLevel = 'middle'
): EventInput[] {
  const events: EventInput[] = [];
  const periodTimes = getPeriodTimes(schoolLevel);

  for (const entry of entries) {
    if (isSaturdayYmd(entry.date) || isHolidaySubject(entry.subject)) {
      continue;
    }

    const periodTime = periodTimes[entry.period];
    if (!periodTime) {
      continue;
    }

    const isoDate = ymdToIsoDate(entry.date);
    const subject = resolveSchoolSubject(entry.subject);

    events.push({
      id: `school-${entry.date}-${entry.period}`,
      title: entry.subject,
      start: `${isoDate}T${periodTime.start}:00`,
      end: `${isoDate}T${periodTime.end}:00`,
      editable: false,
      classNames: ['school-event', 'cal-event-card', subjectClassName(subject)],
      extendedProps: {
        type: 'school',
        period: entry.period,
        subject,
      },
    });
  }

  return events;
}

function scheduleEventId(kind: SchoolScheduleEventKind, date: string, title: string): string {
  const slug = title.replace(/\s+/g, '-');
  return `school-schedule-${kind}-${date}-${slug}`;
}

export function scheduleEventsToCalendarEvents(
  scheduleEvents: SchoolScheduleEvent[]
): EventInput[] {
  return scheduleEvents.map((event) => {
    const isoDate = ymdToIsoDate(event.date);
    const isExam = event.kind === 'exam';

    return {
      id: scheduleEventId(event.kind, event.date, event.title),
      title: event.title,
      start: isoDate,
      allDay: true,
      editable: false,
      classNames: [
        isExam ? 'school-exam-event' : 'school-holiday-event',
        'cal-event-card',
      ],
      extendedProps: {
        type: isExam ? 'school-exam' : 'school-holiday',
        description: event.description ?? '',
        category: event.category,
        kind: event.kind,
      },
    };
  });
}

/** @deprecated scheduleEventsToCalendarEvents 사용 */
export function examEventsToCalendarEvents(
  examEvents: SchoolExamEvent[]
): EventInput[] {
  return scheduleEventsToCalendarEvents(
    examEvents.map((event) => ({ ...event, kind: 'exam' as const }))
  );
}

export function timetableToCalendarEvents(
  entries: TimetableEntry[],
  scheduleEvents: SchoolScheduleEvent[] = [],
  schoolLevel = 'middle'
): EventInput[] {
  return [
    ...scheduleEventsToCalendarEvents(scheduleEvents),
    ...entriesToCalendarEvents(entries, schoolLevel),
  ];
}
