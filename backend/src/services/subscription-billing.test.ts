import { describe, expect, it } from 'vitest';
import { addPlanInterval } from './subscription-billing';

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
