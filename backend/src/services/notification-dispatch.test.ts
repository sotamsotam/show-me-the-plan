import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  evaluateDueNotification,
  normalizeOccurrenceDate,
  processDueNotifications,
  resolveRelationId,
  toDueNotificationRow,
} from './notification-dispatch';
import { NOTIFICATION_UID } from './push-notification-constants';

vi.mock('./web-push', () => ({
  isUserNotificationsEnabled: vi.fn(async () => true),
  sendPushToUser: vi.fn(async () => ({
    sent: 1,
    failed: 0,
    removedSubscriptions: 0,
  })),
}));

import { sendPushToUser } from './web-push';

describe('notification-dispatch helpers', () => {
  it('resolveRelationId accepts numeric and populated ids', () => {
    expect(resolveRelationId(42)).toBe(42);
    expect(resolveRelationId({ id: 7 })).toBe(7);
    expect(resolveRelationId(null)).toBeNull();
  });

  it('toDueNotificationRow normalizes notification rows', () => {
    expect(
      toDueNotificationRow({
        id: 1,
        user: 10,
        todo: 20,
        occurrenceDate: '2026-06-24',
        titleSnapshot: '문제집',
        subjectSnapshot: '수학',
      })
    ).toEqual({
      id: 1,
      userId: 10,
      todoId: 20,
      occurrenceDate: '2026-06-24',
      titleSnapshot: '문제집',
      subjectSnapshot: '수학',
    });
  });

  it('normalizeOccurrenceDate trims datetime values', () => {
    expect(normalizeOccurrenceDate('2026-06-24T00:00:00.000Z')).toBe('2026-06-24');
  });

  it('evaluateDueNotification skips completed, disabled, and missing todos', () => {
    expect(
      evaluateDueNotification({
        notificationsEnabled: true,
        executionStatus: 'completed',
        todoExists: true,
      })
    ).toEqual({ shouldPush: false, skipReason: 'completed' });

    expect(
      evaluateDueNotification({
        notificationsEnabled: true,
        executionStatus: 'partial',
        todoExists: true,
      })
    ).toEqual({ shouldPush: false, skipReason: 'completed' });

    expect(
      evaluateDueNotification({
        notificationsEnabled: false,
        todoExists: true,
      })
    ).toEqual({ shouldPush: false, skipReason: 'suppressed' });

    expect(
      evaluateDueNotification({
        notificationsEnabled: true,
        todoExists: false,
      })
    ).toEqual({ shouldPush: false, skipReason: 'cancelled' });

    expect(
      evaluateDueNotification({
        notificationsEnabled: true,
        todoExists: true,
      })
    ).toEqual({ shouldPush: true, skipReason: null });
  });
});

describe('processDueNotifications', () => {
  beforeEach(() => {
    vi.mocked(sendPushToUser).mockClear();
  });

  it('sends push for due rows and finalizes the queue row', async () => {
    const notificationUpdate = vi.fn(async () => ({}));
    const notificationCreate = vi.fn(async () => ({}));

    const strapi = {
      db: {
        query: vi.fn((uid: string) => {
          if (uid === NOTIFICATION_UID) {
            return {
              findMany: vi.fn(async () => [
                {
                  id: 1,
                  user: 10,
                  todo: 5,
                  occurrenceDate: '2026-06-24',
                  titleSnapshot: '문제집',
                  subjectSnapshot: '수학',
                  sendAt: '2026-06-24T10:00:00.000Z',
                  sent: false,
                },
              ]),
              findOne: vi.fn(async ({ where }: { where: { sent?: boolean } }) =>
                where.sent === false ? [] : null
              ),
              update: notificationUpdate,
              create: notificationCreate,
            };
          }

          if (uid === 'api::study-plan-todo.study-plan-todo') {
            return {
              findOne: vi.fn(async () => ({
                id: 5,
                subject: 'math',
                title: '문제집',
                startTime: '19:00',
                endTime: '20:00',
                recurrenceType: 'weekly',
                daysOfWeek: [2, 4],
                validFrom: '2026-06-01',
                validUntil: '2026-06-30',
                date: null,
                excludedDates: [],
                overrides: {},
                executionRecords: {},
              })),
            };
          }

          if (uid === 'api::user-profile.user-profile') {
            return {
              findOne: vi.fn(async () => ({ subjects: null })),
            };
          }

          return {
            findMany: vi.fn(async () => []),
            findOne: vi.fn(async () => null),
            update: vi.fn(async () => ({})),
            create: vi.fn(async () => ({})),
          };
        }),
      },
      log: { warn: vi.fn() },
    } as never;

    const result = await processDueNotifications(
      strapi,
      new Date('2026-06-24T10:05:00.000Z'),
      100
    );

    expect(result).toEqual({
      processed: 1,
      pushed: 1,
      skipped: 0,
      pushDeliveries: 1,
    });
    expect(notificationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ sent: true }),
      })
    );
    expect(sendPushToUser).toHaveBeenCalledWith(
      strapi,
      10,
      expect.objectContaining({
        title: '[수학] 문제집',
        body: '학습할 시간입니다.',
        todoId: 5,
        occurrenceDate: '2026-06-24',
      })
    );
  });
});
