import { describe, expect, it } from 'vitest';
import { resolveBillingAmount } from './billing';

describe('resolveBillingAmount', () => {
  it('returns full price when no discount is configured', () => {
    expect(resolveBillingAmount(4900, {})).toEqual({
      planPrice: 4900,
      discountAmount: 0,
      pointAmountUsed: 0,
      billedAmount: 4900,
      skipPgCharge: false,
    });
  });

  it('applies percent discount', () => {
    expect(resolveBillingAmount(4900, { discountPercent: 20 })).toEqual({
      planPrice: 4900,
      discountAmount: 980,
      pointAmountUsed: 0,
      billedAmount: 3920,
      skipPgCharge: false,
    });
  });

  it('applies fixed discount after percent discount', () => {
    expect(
      resolveBillingAmount(4900, {
        discountPercent: 20,
        discountFixedAmount: 1000,
      })
    ).toEqual({
      planPrice: 4900,
      discountAmount: 1980,
      pointAmountUsed: 0,
      billedAmount: 2920,
      skipPgCharge: false,
    });
  });

  it('uses override price when provided', () => {
    expect(resolveBillingAmount(4900, { overridePrice: 1000 })).toEqual({
      planPrice: 4900,
      discountAmount: 3900,
      pointAmountUsed: 0,
      billedAmount: 1000,
      skipPgCharge: false,
    });
  });

  it('supports zero billed amount without PG charge', () => {
    expect(resolveBillingAmount(4900, { overridePrice: 0 })).toEqual({
      planPrice: 4900,
      discountAmount: 4900,
      pointAmountUsed: 0,
      billedAmount: 0,
      skipPgCharge: true,
    });
  });

  it('ignores discount outside active window', () => {
    const now = new Date('2026-06-20T00:00:00.000Z');

    expect(
      resolveBillingAmount(
        4900,
        {
          discountPercent: 50,
          discountStartsAt: '2026-07-01T00:00:00.000Z',
        },
        now
      )
    ).toEqual({
      planPrice: 4900,
      discountAmount: 0,
      pointAmountUsed: 0,
      billedAmount: 4900,
      skipPgCharge: false,
    });
  });

  it('does not apply points when usePointsOnNextBilling is false', () => {
    expect(
      resolveBillingAmount(4900, {
        pointBalance: 3000,
        usePointsOnNextBilling: false,
      })
    ).toEqual({
      planPrice: 4900,
      discountAmount: 0,
      pointAmountUsed: 0,
      billedAmount: 4900,
      skipPgCharge: false,
    });
  });

  it('applies points partially when reserved for next billing', () => {
    expect(
      resolveBillingAmount(4900, {
        pointBalance: 3000,
        usePointsOnNextBilling: true,
      })
    ).toEqual({
      planPrice: 4900,
      discountAmount: 3000,
      pointAmountUsed: 3000,
      billedAmount: 1900,
      skipPgCharge: false,
    });
  });

  it('covers full billed amount with points and skips PG charge', () => {
    expect(
      resolveBillingAmount(4900, {
        pointBalance: 5000,
        usePointsOnNextBilling: true,
      })
    ).toEqual({
      planPrice: 4900,
      discountAmount: 4900,
      pointAmountUsed: 4900,
      billedAmount: 0,
      skipPgCharge: true,
    });
  });

  it('applies discount before points', () => {
    expect(
      resolveBillingAmount(4900, {
        discountPercent: 20,
        pointBalance: 3000,
        usePointsOnNextBilling: true,
      })
    ).toEqual({
      planPrice: 4900,
      discountAmount: 3980,
      pointAmountUsed: 3000,
      billedAmount: 920,
      skipPgCharge: false,
    });
  });
});
