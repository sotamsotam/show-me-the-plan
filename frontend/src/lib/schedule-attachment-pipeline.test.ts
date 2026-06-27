import { describe, expect, it } from 'vitest';

import {
  readEventAttachments,
  resolveScheduleAttachmentUrl,
  getStrapiPublicUrl,
} from '@/lib/schedule-attachment';
import { expandedEventsToCalendarEvents, type ExpandedScheduleEvent } from '@/lib/user-schedule';

const SAMPLE_ATTACHMENT = {
  id: 42,
  url: '/uploads/perf.jpg',
  name: 'perf.jpg',
  mime: 'image/jpeg',
  size: 2048,
  width: 1200,
  height: 1600,
};

function buildExpandedEvent(
  overrides: Partial<ExpandedScheduleEvent> = {}
): ExpandedScheduleEvent {
  return {
    id: 'user-7-2026-06-12',
    scheduleId: 7,
    title: '수행평가',
    start: '2026-06-12',
    allDay: true,
    date: '2026-06-12',
    recurrenceType: 'once',
    scheduleCategory: 'other',
    hasOverride: false,
    attachments: [SAMPLE_ATTACHMENT],
    ...overrides,
  };
}

describe('schedule attachment pipeline', () => {
  it('maps backend expanded events to calendar events with attachments', () => {
    const [calendarEvent] = expandedEventsToCalendarEvents([buildExpandedEvent()]);

    expect(calendarEvent?.extendedProps).toMatchObject({
      type: 'user',
      scheduleId: 7,
      allDay: true,
      attachments: [SAMPLE_ATTACHMENT],
    });
  });

  it('reads attachments back from calendar events for the study plan strip', () => {
    const [calendarEvent] = expandedEventsToCalendarEvents([buildExpandedEvent()]);
    const attachments = readEventAttachments(calendarEvent!);

    expect(attachments).toEqual([SAMPLE_ATTACHMENT]);
    expect(resolveScheduleAttachmentUrl(attachments[0]!.url)).toBe(
      `${getStrapiPublicUrl()}/uploads/perf.jpg`
    );
  });

  it('omits attachments from timed calendar events', () => {
    const [calendarEvent] = expandedEventsToCalendarEvents([
      buildExpandedEvent({
        allDay: false,
        start: '2026-06-12T14:00:00',
        end: '2026-06-12T15:00:00',
        attachments: undefined,
      }),
    ]);

    expect(calendarEvent?.extendedProps?.attachments).toBeUndefined();
    expect(readEventAttachments(calendarEvent!)).toEqual([]);
  });

  it('simulates GET /api/user-schedules transformation from backend payload', () => {
    const backendEvents = [
      {
        id: 'user-7-2026-06-12',
        scheduleId: 7,
        title: '수행평가',
        start: '2026-06-12',
        allDay: true,
        date: '2026-06-12',
        recurrenceType: 'once' as const,
        scheduleCategory: 'other' as const,
        hasOverride: false,
        attachments: [SAMPLE_ATTACHMENT],
      },
    ];

    const calendarEvents = expandedEventsToCalendarEvents(backendEvents);
    const attachments = readEventAttachments(calendarEvents[0]!);

    expect(attachments[0]?.url).toBe('/uploads/perf.jpg');
    expect(resolveScheduleAttachmentUrl(attachments[0]!.url)).toContain('/uploads/perf.jpg');
  });
});
