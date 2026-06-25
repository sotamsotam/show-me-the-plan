'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  STUDY_SESSION_MESSAGE,
  buildOccurrenceKey,
  computeStudySessionUntil,
  getCurrentStudyDayDate,
  type StudySessionData,
} from '@/lib/study-session';
import {
  filterEventsByDate,
  type ExpandedStudyPlanTodoEvent,
} from '@/lib/study-plan-todo';

function postMessageToServiceWorker(message: unknown) {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  void navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage(message);
  });
}

export function useStudySession(events: ExpandedStudyPlanTodoEvent[]) {
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const notifyExecutionSaved = useCallback((todoId: number, occurrenceDate: string) => {
    postMessageToServiceWorker({
      type: STUDY_SESSION_MESSAGE.CLEAR,
      occurrenceKey: buildOccurrenceKey(todoId, occurrenceDate),
    });
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== 'hidden') {
        return;
      }

      const studyDayDate = getCurrentStudyDayDate();
      const todaySlots = filterEventsByDate(eventsRef.current, studyDayDate);

      if (todaySlots.length === 0) {
        return;
      }

      const payload: StudySessionData = {
        until: computeStudySessionUntil(todaySlots),
        occurrenceKeys: todaySlots.map((event) =>
          buildOccurrenceKey(event.todoId, event.date)
        ),
      };

      postMessageToServiceWorker({
        type: STUDY_SESSION_MESSAGE.START,
        payload,
      });
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { notifyExecutionSaved };
}
