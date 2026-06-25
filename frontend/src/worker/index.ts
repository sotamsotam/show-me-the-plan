/// <reference lib="webworker" />

import {
  STUDY_SESSION_MESSAGE,
  removeOccurrenceFromSession,
  shouldSuppressPushForOccurrence,
  shouldSuppressPushOnTodoForeground,
  type PushNotificationPayload,
} from '../lib/study-session';
import {
  deleteStudySession,
  readStudySession,
  writeStudySession,
} from './study-session-store';

declare const self: ServiceWorkerGlobalScope;

const NOTIFICATION_ICON = '/icons/icon-192x192.png';

function parsePushPayload(event: PushEvent): PushNotificationPayload {
  try {
    const text = event.data?.text();

    if (!text) {
      return {};
    }

    return JSON.parse(text) as PushNotificationPayload;
  } catch {
    return {};
  }
}

async function shouldSuppressForForeground(): Promise<boolean> {
  const clientList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  return shouldSuppressPushOnTodoForeground(
    clientList.map((client) => ({
      visibilityState: client.visibilityState,
      url: client.url,
    }))
  );
}

async function shouldSuppressForStudySession(
  todoId?: number,
  occurrenceDate?: string
): Promise<boolean> {
  const session = await readStudySession();
  const active = shouldSuppressPushForOccurrence(session, todoId, occurrenceDate);

  if (session && !active && Date.now() >= session.until) {
    await deleteStudySession();
  }

  return active;
}

async function handlePush(event: PushEvent): Promise<void> {
  const payload = parsePushPayload(event);

  if (await shouldSuppressForForeground()) {
    return;
  }

  if (
    await shouldSuppressForStudySession(payload.todoId, payload.occurrenceDate)
  ) {
    return;
  }

  const title = payload.title ?? 'Show Me The Plan';
  const body = payload.body ?? '학습할 시간입니다';
  const url = payload.url ?? '/dashboard/todo';
  const tag =
    payload.todoId && payload.occurrenceDate
      ? `study-todo-${payload.todoId}-${payload.occurrenceDate}`
      : undefined;

  await self.registration.showNotification(title, {
    body,
    icon: NOTIFICATION_ICON,
    tag,
    data: {
      url,
      todoId: payload.todoId,
      occurrenceDate: payload.occurrenceDate,
    },
  });
}

async function handleNotificationClick(event: NotificationEvent): Promise<void> {
  event.notification.close();

  const targetUrl =
    typeof event.notification.data?.url === 'string'
      ? event.notification.data.url
      : '/dashboard/todo';
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  const clientList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  for (const client of clientList) {
    if (!('focus' in client)) {
      continue;
    }

    await client.focus();

    if ('navigate' in client && typeof client.navigate === 'function') {
      await client.navigate(absoluteUrl);
    }

    return;
  }

  await self.clients.openWindow(absoluteUrl);
}

async function handleStudySessionStart(payload: unknown): Promise<void> {
  if (!payload || typeof payload !== 'object') {
    return;
  }

  const session = payload as { until?: unknown; occurrenceKeys?: unknown };

  if (
    typeof session.until !== 'number' ||
    !Array.isArray(session.occurrenceKeys) ||
    session.occurrenceKeys.some((key) => typeof key !== 'string')
  ) {
    return;
  }

  await writeStudySession({
    until: session.until,
    occurrenceKeys: session.occurrenceKeys,
  });
}

async function handleStudySessionClear(occurrenceKey: unknown): Promise<void> {
  if (typeof occurrenceKey !== 'string' || !occurrenceKey) {
    return;
  }

  const session = await readStudySession();

  if (!session) {
    return;
  }

  const nextSession = removeOccurrenceFromSession(session, occurrenceKey);

  if (!nextSession) {
    await deleteStudySession();
    return;
  }

  await writeStudySession(nextSession);
}

self.addEventListener('push', (event) => {
  event.waitUntil(handlePush(event));
});

self.addEventListener('notificationclick', (event) => {
  event.waitUntil(handleNotificationClick(event));
});

self.addEventListener('message', (event) => {
  const data = event.data as { type?: string; payload?: unknown; occurrenceKey?: unknown };

  if (data?.type === STUDY_SESSION_MESSAGE.START) {
    event.waitUntil(handleStudySessionStart(data.payload));
    return;
  }

  if (data?.type === STUDY_SESSION_MESSAGE.CLEAR) {
    event.waitUntil(handleStudySessionClear(data.occurrenceKey));
  }
});

export {};
