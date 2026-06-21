import { describe, expect, it, vi } from 'vitest';
import {
  createTrialSubscription,
  hasActiveSubscription,
  isPeriodActive,
  syncSubscriptionExpiry,
} from './subscription';
import { TRIAL_DAYS } from './subscription-constants';

function createMockStrapi(state: {
  profile?: { schoolLevel: string } | null;
  subscription?: Record<string, unknown> | null;
}) {
  return {
    db: {
      query: vi.fn((uid: string) => {
        if (uid === 'api::user-profile.user-profile') {
          return {
            findOne: vi.fn(async () => state.profile),
          };
        }
        if (uid === 'api::subscription.subscription') {
          return {
            findOne: vi.fn(async () => state.subscription),
            update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
              ...state.subscription,
              ...data,
            })),
            create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
              const row = { id: 1, ...data };
              state.subscription = row;
              return row;
            }),
          };
        }
        return { findOne: vi.fn(async () => null) };
      }),
    },
  } as never;
}

describe('createTrialSubscription', () => {
  it('creates 14-day trialing subscription', async () => {
    const now = new Date('2026-06-20T00:00:00.000Z');
    const strapi = createMockStrapi({ subscription: null });

    const row = await createTrialSubscription(strapi, 42, now);
    const periodEnd = new Date(String(row.currentPeriodEnd));

    expect(row.status).toBe('trialing');
    expect(row.hasUsedTrial).toBe(true);
    expect(
      Math.round((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    ).toBe(TRIAL_DAYS);
  });
});

describe('hasActiveSubscription', () => {
  it('returns true for active trialing within period', async () => {
    const strapi = createMockStrapi({
      profile: { schoolLevel: 'high' },
      subscription: {
        id: 1,
        status: 'trialing',
        currentPeriodEnd: '2026-07-04T00:00:00.000Z',
      },
    });

    await expect(
      hasActiveSubscription(strapi, 1, new Date('2026-06-20T00:00:00.000Z'))
    ).resolves.toBe(true);
  });

  it('returns false when period ended (expired sync)', async () => {
    const strapi = createMockStrapi({
      profile: { schoolLevel: 'high' },
      subscription: {
        id: 1,
        status: 'trialing',
        currentPeriodEnd: '2026-06-01T00:00:00.000Z',
      },
    });

    await expect(
      hasActiveSubscription(strapi, 1, new Date('2026-06-20T00:00:00.000Z'))
    ).resolves.toBe(false);
  });
});

describe('syncSubscriptionExpiry', () => {
  it('marks past-due period subscriptions as expired', async () => {
    const strapi = createMockStrapi({
      subscription: {
        id: 1,
        status: 'active',
        currentPeriodEnd: '2026-06-01T00:00:00.000Z',
      },
    });

    const synced = await syncSubscriptionExpiry(
      strapi,
      {
        id: 1,
        status: 'active',
        currentPeriodEnd: '2026-06-01T00:00:00.000Z',
      },
      new Date('2026-06-20T00:00:00.000Z')
    );

    expect(synced.status).toBe('expired');
  });
});

describe('isPeriodActive', () => {
  it('returns false when period end is in the past', () => {
    expect(
      isPeriodActive(
        { currentPeriodEnd: '2026-06-01T00:00:00.000Z' },
        new Date('2026-06-20T00:00:00.000Z')
      )
    ).toBe(false);
  });
});
