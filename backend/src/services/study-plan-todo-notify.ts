import type { Core } from '@strapi/strapi';

import {
  NOTIFICATION_UID,
  PUSH_SUBSCRIPTION_UID,
  PUSH_TIMEZONE,
  type NotificationSkipReason,
} from './push-notification-constants';
import {
  expandStudyPlanTodosToEvents,
  resolveOccurrenceFields,
  type ExecutionStatus,
  type PlanSubjectKey,
  type StudyPlanTodoRecord,
  toStudyPlanTodoRecord,
} from './study-plan-todo';
import { normalizeTime } from './schedule-time';
import {
  isLegacyStudyPlanSubject,
  LEGACY_SUBJECT_LABELS,
  type UserSubject,
} from './user-subject';
import { parseUserSubjects } from './user-subject-validation';

export interface NextNotifyOccurrence {
  occurrenceDate: string;
  sendAt: Date;
  titleSnapshot: string;
  subjectSnapshot: string;
}

export function isExecutionAlarmSkipped(status: ExecutionStatus | undefined): boolean {
  return status === 'completed' || status === 'partial';
}

export function resolveSubjectLabel(
  subject: PlanSubjectKey,
  subjects: UserSubject[]
): string {
  const matched = subjects.find((entry) => entry.id === subject);

  if (matched?.label) {
    return matched.label;
  }

  if (isLegacyStudyPlanSubject(subject)) {
    return LEGACY_SUBJECT_LABELS[subject];
  }

  return subject;
}

export function buildSendAtInTimezone(
  occurrenceDate: string,
  startTime: string,
  timezone = PUSH_TIMEZONE
): Date {
  const normalized = normalizeTime(startTime);
  const offset = timezone === 'Asia/Seoul' ? '+09:00' : 'Z';
  return new Date(`${occurrenceDate}T${normalized}:00${offset}`);
}

function shiftIsoDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  parsed.setDate(parsed.getDate() + days);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSeoulDateString(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PUSH_TIMEZONE }).format(now);
}

function computeSearchRangeEnd(todo: StudyPlanTodoRecord, rangeStart: string): string {
  if (todo.recurrenceType === 'once') {
    if (!todo.date) {
      return rangeStart;
    }

    return shiftIsoDate(todo.date, 1);
  }

  if (!todo.validUntil) {
    return shiftIsoDate(rangeStart, 366);
  }

  return shiftIsoDate(todo.validUntil, 1);
}

export function computeNextNotifyOccurrence(
  todo: StudyPlanTodoRecord,
  now: Date,
  subjects: UserSubject[] = []
): NextNotifyOccurrence | null {
  const rangeStart = getSeoulDateString(now);
  const rangeEnd = computeSearchRangeEnd(todo, rangeStart);

  if (rangeEnd <= rangeStart) {
    return null;
  }

  const events = expandStudyPlanTodosToEvents([todo], rangeStart, rangeEnd);

  for (const event of events) {
    const occurrenceDate = event.date;
    const fields = resolveOccurrenceFields(todo, occurrenceDate);
    const sendAt = buildSendAtInTimezone(occurrenceDate, fields.startTime);

    if (sendAt.getTime() <= now.getTime()) {
      continue;
    }

    const execution = todo.executionRecords[occurrenceDate];

    if (isExecutionAlarmSkipped(execution?.status)) {
      continue;
    }

    const subjectSnapshot = resolveSubjectLabel(todo.subject, subjects);

    return {
      occurrenceDate,
      sendAt,
      titleSnapshot: fields.title.trim(),
      subjectSnapshot,
    };
  }

  return null;
}

export function buildPushNotificationContent(
  subjectSnapshot: string,
  titleSnapshot: string
): { title: string; body: string } {
  return {
    title: `[${subjectSnapshot}] ${titleSnapshot}`,
    body: '학습할 시간입니다.',
  };
}

export async function cancelAllPendingForTodo(
  strapi: Core.Strapi,
  todoId: number,
  skipReason: NotificationSkipReason = 'cancelled'
): Promise<void> {
  const pending = await strapi.db.query(NOTIFICATION_UID).findMany({
    where: { todo: todoId, sent: false },
  });

  if (pending.length === 0) {
    return;
  }

  const sentAt = new Date();

  for (const row of pending) {
    await strapi.db.query(NOTIFICATION_UID).update({
      where: { id: row.id },
      data: {
        sent: true,
        skipReason,
        sentAt,
      },
    });
  }
}

export async function cancelPendingForOccurrence(
  strapi: Core.Strapi,
  todoId: number,
  occurrenceDate: string,
  skipReason: NotificationSkipReason = 'completed'
): Promise<void> {
  const pending = await strapi.db.query(NOTIFICATION_UID).findMany({
    where: {
      todo: todoId,
      occurrenceDate,
      sent: false,
    },
  });

  if (pending.length === 0) {
    return;
  }

  const sentAt = new Date();

  for (const row of pending) {
    await strapi.db.query(NOTIFICATION_UID).update({
      where: { id: row.id },
      data: {
        sent: true,
        skipReason,
        sentAt,
      },
    });
  }
}

export async function syncTodoNotificationQueue(
  strapi: Core.Strapi,
  todo: StudyPlanTodoRecord,
  userId: number,
  subjects: UserSubject[] = [],
  now = new Date()
): Promise<void> {
  await cancelAllPendingForTodo(strapi, todo.id, 'cancelled');

  const next = computeNextNotifyOccurrence(todo, now, subjects);

  if (!next) {
    return;
  }

  await strapi.db.query(NOTIFICATION_UID).create({
    data: {
      user: userId,
      todo: todo.id,
      occurrenceDate: next.occurrenceDate,
      queueKey: `${todo.id}:${next.occurrenceDate}`,
      sendAt: next.sendAt,
      sent: false,
      titleSnapshot: next.titleSnapshot,
      subjectSnapshot: next.subjectSnapshot,
    },
  });
}

export async function syncTodoNotificationQueueFromRaw(
  strapi: Core.Strapi,
  rawTodo: Record<string, unknown>,
  userId: number
): Promise<void> {
  const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
    where: { user: userId },
  });
  const subjects = parseUserSubjects(profile?.subjects ?? null) ?? [];
  await syncTodoNotificationQueue(
    strapi,
    toStudyPlanTodoRecord(rawTodo),
    userId,
    subjects
  );
}

export async function handleExecutionNotificationUpdate(
  strapi: Core.Strapi,
  todo: StudyPlanTodoRecord,
  userId: number,
  occurrenceDate: string,
  status: ExecutionStatus
): Promise<void> {
  if (isExecutionAlarmSkipped(status)) {
    await cancelPendingForOccurrence(strapi, todo.id, occurrenceDate, 'completed');
  }

  const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
    where: { user: userId },
  });
  const subjects = parseUserSubjects(profile?.subjects ?? null) ?? [];

  await syncTodoNotificationQueue(strapi, todo, userId, subjects);
}
