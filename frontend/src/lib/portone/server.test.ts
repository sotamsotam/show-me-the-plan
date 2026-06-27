import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBillingKey } from './server';

describe('getBillingKey', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('parses GET response when billingKey is at the root (PortOne V2)', async () => {
    process.env.PORTONE_API_SECRET = 'test-api-secret';
    process.env.NEXT_PUBLIC_PORTONE_STORE_ID = 'store-test-id';
    process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY = 'channel-test-key';

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          status: 'ISSUED',
          billingKey: 'billing-key-abc',
          issuedAt: '2026-06-27T00:00:00Z',
        })
      )
    );

    await expect(getBillingKey('billing-key-abc')).resolves.toEqual({
      status: 'ISSUED',
      billingKey: 'billing-key-abc',
      issuedAt: '2026-06-27T00:00:00Z',
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.portone.io/billing-keys/billing-key-abc?storeId=store-test-id',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('parses wrapped billingKeyInfo response (issue API shape)', async () => {
    process.env.PORTONE_API_SECRET = 'test-api-secret';
    process.env.NEXT_PUBLIC_PORTONE_STORE_ID = 'store-test-id';
    process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY = 'channel-test-key';

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          billingKeyInfo: {
            billingKey: 'billing-key-wrapped',
            status: 'ISSUED',
          },
        })
      )
    );

    await expect(getBillingKey('billing-key-wrapped')).resolves.toEqual({
      billingKey: 'billing-key-wrapped',
      status: 'ISSUED',
    });
  });

  it('throws when billing key is missing in response', async () => {
    process.env.PORTONE_API_SECRET = 'test-api-secret';
    process.env.NEXT_PUBLIC_PORTONE_STORE_ID = 'store-test-id';
    process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY = 'channel-test-key';

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          status: 'DELETED',
        })
      )
    );

    await expect(getBillingKey('billing-key-missing')).rejects.toThrow(
      '빌링키 정보를 찾을 수 없습니다.'
    );
  });
});
