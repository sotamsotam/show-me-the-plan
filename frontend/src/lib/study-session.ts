import { resolveStudyDayDateFromIso } from '@/lib/schedule-time';

export const STUDY_SESSION_BUFFER_MS = 10 * 60 * 1000;
export const STUDY_SESSION_MAX_TTL_MS = 90 * 60 * 1000;

export const STUDY_SESSION_MESSAGE = {
  START: 'STUDY_SESSION_START',
  CLEAR: 'STUDY_SESSION_CLEAR',
} as const;

export const STUDY_SESSION_DB = {
  name: 'smtplan-push-v1',
  store: 'studySession',
  key: 'active',
} as const;

export interface StudySessionData {
  until: number;
  occurrenceKeys: string[];
}

export interface PushNotificationPayload {
  title?: string;
  body?: string;
  url?: string;
  todoId?: number;
  occurrenceDate?: string;
}

export function buildOccurrenceKey(todoId: number, occurrenceDate: string): string {
  return `${todoId}:${occurrenceDate}`;
}

export function getCurrentStudyDayDate(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
  return resolveStudyDayDateFromIso(iso);
}

export function computeStudySessionUntil(
  events: { end: string }[],
  nowMs: number = Date.now()
): number {
  let maxEndMs = nowMs;

  for (const event of events) {
    const endMs = new Date(event.end).getTime();

    if (Number.isFinite(endMs)) {
      maxEndMs = Math.max(maxEndMs, endMs);
    }
  }

  return Math.min(maxEndMs + STUDY_SESSION_BUFFER_MS, nowMs + STUDY_SESSION_MAX_TTL_MS);
}

export function isStudySessionActive(
  session: StudySessionData | null,
  occurrenceKey: string,
  nowMs: number = Date.now()
): boolean {
  if (!session) {
    return false;
  }

  if (nowMs >= session.until) {
    return false;
  }

  return session.occurrenceKeys.includes(occurrenceKey);
}

export function removeOccurrenceFromSession(
  session: StudySessionData,
  occurrenceKey: string
): StudySessionData | null {
  const occurrenceKeys = session.occurrenceKeys.filter((key) => key !== occurrenceKey);

  if (occurrenceKeys.length === 0) {
    return null;
  }

  return { ...session, occurrenceKeys };
}

export const TODO_FOREGROUND_PATH = '/dashboard/todo';

export function shouldSuppressPushOnTodoForeground(
  clients: Array<{ visibilityState: string; url: string }>
): boolean {
  for (const client of clients) {
    if (client.visibilityState !== 'visible') {
      continue;
    }

    try {
      if (new URL(client.url).pathname === TODO_FOREGROUND_PATH) {
        return true;
      }
    } catch {
      // Ignore malformed client URLs.
    }
  }

  return false;
}

export function shouldSuppressPushForOccurrence(
  session: StudySessionData | null,
  todoId: number | undefined,
  occurrenceDate: string | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!todoId || !occurrenceDate) {
    return false;
  }

  return isStudySessionActive(
    session,
    buildOccurrenceKey(todoId, occurrenceDate),
    nowMs
  );
}
