import { describe, expect, it } from 'vitest';

import {
  assertAttachmentIdsAvailable,
  buildAttachmentRelationData,
  collectRemovedAttachmentIds,
  normalizeAttachmentIds,
  normalizeScheduleAttachments,
  validateScheduleAttachmentPolicy,
} from './schedule-attachment';
import {
  buildScheduleData,
  expandSchedulesToEvents,
  toScheduleRecord,
  validateScheduleInput,
} from './user-schedule';

const SAMPLE_ATTACHMENT = {
  id: 42,
  url: '/uploads/perf.jpg',
  name: 'perf.jpg',
  mime: 'image/jpeg',
  size: 2048,
  width: 1200,
  height: 1600,
};

describe('schedule attachment integration', () => {
  it('round-trips populated Strapi rows through record normalization', () => {
    const raw = {
      id: 7,
      title: '수행평가',
      scheduleCategory: 'other',
      startTime: '00:00',
      endTime: '23:59',
      allDay: true,
      recurrenceType: 'once',
      daysOfWeek: null,
      validFrom: null,
      validUntil: null,
      date: '2026-06-12',
      endDate: null,
      excludedDates: [],
      overrides: {},
      attachments: [SAMPLE_ATTACHMENT],
    };

    const record = toScheduleRecord(raw);

    expect(record.attachments).toEqual([SAMPLE_ATTACHMENT]);
    expect(normalizeAttachmentIds(record.attachments)).toEqual([42]);
  });

  it('validates create payload for all-day schedule with attachment ids', () => {
    const payload = {
      title: '수행평가',
      scheduleCategory: 'other' as const,
      startTime: '00:00',
      endTime: '23:59',
      allDay: true,
      recurrenceType: 'once' as const,
      date: '2026-06-12',
      endDate: '2026-06-12',
      attachmentIds: [42],
    };

    expect(validateScheduleInput(payload)).toBeNull();
    expect(buildAttachmentRelationData([42])).toEqual({ attachments: [42] });
    expect(buildScheduleData(payload).allDay).toBe(true);
  });

  it('rejects timed schedule with attachment ids', () => {
    const error = validateScheduleInput({
      title: '학원',
      scheduleCategory: 'academy',
      startTime: '14:00',
      endTime: '16:00',
      allDay: false,
      recurrenceType: 'once',
      date: '2026-06-12',
      attachmentIds: [42],
    });

    expect(error).toBe('첨부 이미지는 종일 일정 또는 수행평가에서만 사용할 수 있습니다.');
    expect(
      validateScheduleAttachmentPolicy({ allDay: false, attachmentIds: [42] })
    ).toBe('첨부 이미지는 종일 일정 또는 수행평가에서만 사용할 수 있습니다.');
  });

  it('allows performance assessment with attachment ids', () => {
    const payload = {
      title: '수학 수행평가',
      scheduleCategory: 'performance' as const,
      startTime: '00:00',
      endTime: '23:59',
      allDay: true,
      recurrenceType: 'once' as const,
      date: '2026-06-12',
      linkedSubject: '수학',
      linkedPeriod: 3,
      attachmentIds: [42],
    };

    expect(validateScheduleInput(payload)).toBeNull();
    expect(buildScheduleData(payload)).toMatchObject({
      scheduleCategory: 'performance',
      linkedSubject: '수학',
      linkedPeriod: 3,
    });
  });

  it('expands all-day once schedules with attachments into API events', () => {
    const record = toScheduleRecord({
      id: 7,
      title: '수행평가',
      scheduleCategory: 'other',
      startTime: '00:00',
      endTime: '23:59',
      allDay: true,
      recurrenceType: 'once',
      date: '2026-06-12',
      endDate: '2026-06-14',
      excludedDates: [],
      overrides: {},
      attachments: [SAMPLE_ATTACHMENT],
    });

    const events = expandSchedulesToEvents([record], '2026-06-01', '2026-06-30');

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      scheduleId: 7,
      allDay: true,
      date: '2026-06-12',
      attachments: [SAMPLE_ATTACHMENT],
    });
  });

  it('tracks removed attachment ids during update', () => {
    const removed = collectRemovedAttachmentIds([SAMPLE_ATTACHMENT], []);

    expect(removed).toEqual([42]);
    expect(buildAttachmentRelationData([])).toEqual({ attachments: [] });
    expect(buildAttachmentRelationData(undefined)).toBeUndefined();
  });

  it('rejects attachment ids already linked to another schedule', async () => {
    const strapi = {
      db: {
        query: (uid: string) => {
          if (uid === 'plugin::upload.file') {
            return {
              findMany: async () => [SAMPLE_ATTACHMENT],
            };
          }

          if (uid === 'api::user-schedule.user-schedule') {
            return {
              findMany: async () => [
                {
                  id: 99,
                  attachments: [SAMPLE_ATTACHMENT],
                },
              ],
            };
          }

          throw new Error(`unexpected uid: ${uid}`);
        },
      },
    };

    const error = await assertAttachmentIdsAvailable(strapi as never, [42]);

    expect(error).toBe('이미 다른 일정에 연결된 첨부 파일입니다.');
  });

  it('accepts attachment ids when only the current schedule owns them', async () => {
    const schedules = [
      {
        id: 7,
        attachments: [SAMPLE_ATTACHMENT],
      },
      {
        id: 99,
        attachments: [],
      },
    ];

    const strapi = {
      db: {
        query: (uid: string) => {
          if (uid === 'plugin::upload.file') {
            return {
              findMany: async () => [SAMPLE_ATTACHMENT],
            };
          }

          if (uid === 'api::user-schedule.user-schedule') {
            return {
              findMany: async ({
                where,
              }: {
                where?: { id?: { $ne?: number } };
              }) => {
                const excludeId = where?.id?.$ne;
                if (excludeId == null) {
                  return schedules;
                }

                return schedules.filter((schedule) => schedule.id !== excludeId);
              },
            };
          }

          throw new Error(`unexpected uid: ${uid}`);
        },
      },
    };

    const error = await assertAttachmentIdsAvailable(strapi as never, [42], {
      excludeScheduleId: 7,
    });

    expect(error).toBeNull();
  });

  it('normalizes populated and id-only attachment payloads consistently', () => {
    expect(normalizeScheduleAttachments([SAMPLE_ATTACHMENT])).toEqual([SAMPLE_ATTACHMENT]);
    expect(normalizeAttachmentIds([{ id: 42 }, 42, '42'])).toEqual([42]);
  });
});
