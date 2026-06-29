import type { Core } from '@strapi/strapi';

import {
  NOTIFICATION_UID,
  type NotificationSkipReason,
} from './push-notification-constants';
import {
  buildPushNotificationContent,
  isExecutionAlarmSkipped,
  syncTodoNotificationQueue,
} from './study-plan-todo-notify';
import {
  toStudyPlanTodoRecord,
  type StudyPlanTodoRecord,
} from './study-plan-todo';
import { parseUserSubjects } from './user-subject-validation';
import { isUserNotificationsEnabled, sendPushToUser } from './web-push';

const STUDY_PLAN_TODO_UID = 'api::study-plan-todo.study-plan-todo' as const;

export const DUE_NOTIFICATION_BATCH_LIMIT = 1000;

export interface DueNotificationRow {
  id: number;
  userId: number;
  todoId: number;
  occurrenceDate: string;
  titleSnapshot: string | null;
  subjectSnapshot: string | null;
}

export interface ProcessDueNotificationsResult {
  processed: number;
  pushed: number;
  skipped: number;
  pushDeliveries: number;
}

export interface EvaluateDueNotificationInput {
  notificationsEnabled: boolean;
  executionStatus?: StudyPlanTodoRecord['executionRecords'][string]['status'];
  todoExists: boolean;
}

export interface EvaluateDueNotificationResult {
  shouldPush: boolean;
  skipReason: NotificationSkipReason | null;
}

export function resolveRelationId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (value && typeof value === 'object' && 'id' in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  return null;
}

export function normalizeOccurrenceDate(value: unknown): string {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

export function toDueNotificationRow(raw: Record<string, unknown>): DueNotificationRow | null {
  const id = Number(raw.id);
  const userId = resolveRelationId(raw.user);
  const todoId = resolveRelationId(raw.todo);
  const occurrenceDate = normalizeOccurrenceDate(raw.occurrenceDate);

  if (!Number.isInteger(id) || id <= 0 || !userId || !todoId || !occurrenceDate) {
    return null;
  }

  return {
    id,
    userId,
    todoId,
    occurrenceDate,
    titleSnapshot:
      typeof raw.titleSnapshot === 'string' ? raw.titleSnapshot : null,
    subjectSnapshot:
      typeof raw.subjectSnapshot === 'string' ? raw.subjectSnapshot : null,
  };
}

export function evaluateDueNotification(
  input: EvaluateDueNotificationInput
): EvaluateDueNotificationResult {
  if (!input.todoExists) {
    return { shouldPush: false, skipReason: 'cancelled' };
  }

  if (!input.notificationsEnabled) {
    return { shouldPush: false, skipReason: 'suppressed' };
  }

  if (isExecutionAlarmSkipped(input.executionStatus)) {
    return { shouldPush: false, skipReason: 'completed' };
  }

  return { shouldPush: true, skipReason: null };
}

async function loadUserSubjects(strapi: Core.Strapi, userId: number) {
  const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
    where: { user: userId },
  });

  return parseUserSubjects(profile?.subjects ?? null) ?? [];
}

async function finalizeNotification(
  strapi: Core.Strapi,
  row: DueNotificationRow,
  skipReason: NotificationSkipReason | null,
  now: Date
): Promise<StudyPlanTodoRecord | null> {
  await strapi.db.query(NOTIFICATION_UID).update({
    where: { id: row.id },
    data: {
      sent: true,
      skipReason,
      sentAt: now,
    },
  });

  const todoRaw = await strapi.db.query(STUDY_PLAN_TODO_UID).findOne({
    where: { id: row.todoId },
  });

  if (!todoRaw) {
    return null;
  }

  const todo = toStudyPlanTodoRecord(todoRaw as Record<string, unknown>);
  const subjects = await loadUserSubjects(strapi, row.userId);

  await syncTodoNotificationQueue(strapi, todo, row.userId, subjects, now);

  return todo;
}

export async function processDueNotifications(
  strapi: Core.Strapi,
  now = new Date(),
  limit = DUE_NOTIFICATION_BATCH_LIMIT
): Promise<ProcessDueNotificationsResult> {
  const dueRows = await strapi.db.query(NOTIFICATION_UID).findMany({
    where: {
      sent: false,
      sendAt: { $lte: now },
    },
    populate: ['user', 'todo'],
    orderBy: { sendAt: 'asc' },
    limit,
  });

  let processed = 0;
  let pushed = 0;
  let skipped = 0;
  let pushDeliveries = 0;

  for (const raw of dueRows) {
    const row = toDueNotificationRow(raw as Record<string, unknown>);

    if (!row) {
      continue;
    }

    processed += 1;

    const todoRaw = await strapi.db.query(STUDY_PLAN_TODO_UID).findOne({
      where: { id: row.todoId },
    });
    const todoExists = todoRaw != null;
    const executionStatus = todoExists
      ? toStudyPlanTodoRecord(todoRaw as Record<string, unknown>).executionRecords[
          row.occurrenceDate
        ]?.status
      : undefined;
    const notificationsEnabled = await isUserNotificationsEnabled(strapi, row.userId);

    const decision = evaluateDueNotification({
      notificationsEnabled,
      executionStatus,
      todoExists,
    });

    if (!decision.shouldPush) {
      skipped += 1;
      await finalizeNotification(strapi, row, decision.skipReason, now);
      continue;
    }

    const titleSnapshot = row.titleSnapshot ?? '학습 계획';
    const subjectSnapshot = row.subjectSnapshot ?? '과목';
    const content = buildPushNotificationContent(subjectSnapshot, titleSnapshot);

    const pushResult = await sendPushToUser(strapi, row.userId, {
      title: content.title,
      body: content.body,
      url: `/dashboard/todo?date=${row.occurrenceDate}`,
      todoId: row.todoId,
      occurrenceDate: row.occurrenceDate,
    });

    pushed += 1;
    pushDeliveries += pushResult.sent;

    await finalizeNotification(strapi, row, null, now);
  }

  return { processed, pushed, skipped, pushDeliveries };
}

export async function backfillStudyPlanTodoNotificationQueues(
  strapi: Core.Strapi
): Promise<number> {
  const todos = await strapi.db.query(STUDY_PLAN_TODO_UID).findMany({
    select: ['id', 'user'],
    orderBy: { id: 'asc' },
  });

  let synced = 0;

  for (const raw of todos) {
    const todoId = Number(raw.id);
    const userId = resolveRelationId(raw.user);

    if (!Number.isInteger(todoId) || todoId <= 0 || !userId) {
      continue;
    }

    const todoRaw = await strapi.db.query(STUDY_PLAN_TODO_UID).findOne({
      where: { id: todoId },
    });

    if (!todoRaw) {
      continue;
    }

    const subjects = await loadUserSubjects(strapi, userId);
    const todo = toStudyPlanTodoRecord(todoRaw as Record<string, unknown>);

    await syncTodoNotificationQueue(strapi, todo, userId, subjects);
    synced += 1;
  }

  return synced;
}
