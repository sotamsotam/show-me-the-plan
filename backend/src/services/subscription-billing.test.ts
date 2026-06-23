import { describe, expect, it, vi } from 'vitest';
import {
  addPlanInterval,
  resumeSubscriptionAfterCancel,
  ResumeSubscriptionError,
} from './subscription-billing';
import { SUBSCRIPTION_UID } from './subscription-constants';

describe('addPlanInterval', () => {
  it('adds one month for monthly plans', () => {
    const start = new Date('2026-06-20T00:00:00.000Z');
    const end = addPlanInterval(start, 'month');

    expect(end.toISOString()).toBe('2026-07-20T00:00:00.000Z');
  });

  it('adds one year for yearly plans', () => {
    const start = new Date('2026-06-20T00:00:00.000Z');
    const end = addPlanInterval(start, 'year');

    expect(end.toISOString()).toBe('2027-06-20T00:00:00.000Z');
  });
});

function createResumeMockStrapi(subscription: Record<string, unknown> | null) {
  return {
    db: {
      query: vi.fn((uid: string) => {
        if (uid === SUBSCRIPTION_UID) {
          return {
            findOne: vi.fn(async () => subscription),
            update: vi.fn(
              async ({ data }: { data: Record<string, unknown> }) => ({
                ...subscription,
                ...data,
              })
            ),
          };
        }

        return { findOne: vi.fn(async () => null) };
      }),
    },
  } as never;
}

describe('resumeSubscriptionAfterCancel', () => {
  const now = new Date('2026-06-20T00:00:00.000Z');

  it('clears cancelAtPeriodEnd when scheduled for cancel', async () => {
    const strapi = createResumeMockStrapi({
      id: 1,
      status: 'active',
      cancelAtPeriodEnd: true,
      canceledAt: '2026-06-19T00:00:00.000Z',
      currentPeriodEnd: '2026-07-06T00:00:00.000Z',
    });

    const updated = await resumeSubscriptionAfterCancel(strapi, 42, now);

    expect(updated?.cancelAtPeriodEnd).toBe(false);
    expect(updated?.canceledAt).toBeNull();
  });

  it('returns subscription unchanged when cancel is not scheduled', async () => {
    const strapi = createResumeMockStrapi({
      id: 1,
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: '2026-07-06T00:00:00.000Z',
    });

    const updated = await resumeSubscriptionAfterCancel(strapi, 42, now);

    expect(updated?.cancelAtPeriodEnd).toBe(false);
  });

  it('rejects when period already ended', async () => {
    const strapi = createResumeMockStrapi({
      id: 1,
      status: 'active',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2026-06-01T00:00:00.000Z',
    });

    await expect(resumeSubscriptionAfterCancel(strapi, 42, now)).rejects.toBeInstanceOf(
      ResumeSubscriptionError
    );
  });

  it('rejects when subscription status is expired', async () => {
    const strapi = createResumeMockStrapi({
      id: 1,
      status: 'expired',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2026-07-06T00:00:00.000Z',
    });

    await expect(resumeSubscriptionAfterCancel(strapi, 42, now)).rejects.toBeInstanceOf(
      ResumeSubscriptionError
    );
  });
});
