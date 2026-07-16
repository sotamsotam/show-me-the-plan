import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getUserSchedulesInRange,
  invalidateCachedUserSchedules,
  subscribeUserSchedulesInvalidation,
} from './cached-user-schedules';

describe('cached-user-schedules category cache', () => {
  afterEach(() => {
    invalidateCachedUserSchedules(null);
    vi.unstubAllGlobals();
  });

  it('keeps filtered and unfiltered queries in separate cache entries', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ schedules: [{ id: 1 }], events: [] }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ schedules: [{ id: 2, scheduleCategory: 'performance' }], events: [] }),
          { status: 200 }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    const withStudent = (url: string) => url;

    await getUserSchedulesInRange(
      { start: '2026-06-01', end: '2026-07-01', studentUserId: null },
      withStudent
    );
    await getUserSchedulesInRange(
      {
        start: '2026-06-01',
        end: '2026-07-01',
        studentUserId: null,
        scheduleCategory: 'performance',
      },
      withStudent
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      '/api/user-schedules?start=2026-06-01&end=2026-07-01'
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      'scheduleCategory=performance'
    );
  });

  it('notifies subscribers on invalidate', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeUserSchedulesInvalidation(listener);

    invalidateCachedUserSchedules(null);
    expect(listener).toHaveBeenCalledWith(null);

    unsubscribe();
    invalidateCachedUserSchedules(null);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
