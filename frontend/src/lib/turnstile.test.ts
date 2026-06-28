import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getRequestClientIp,
  isTurnstileEnabled,
  verifyTurnstileToken,
} from './turnstile';

describe('turnstile helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('is disabled when TURNSTILE_ENABLED is false', () => {
    vi.stubEnv('TURNSTILE_ENABLED', 'false');
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');

    expect(isTurnstileEnabled()).toBe(false);
  });

  it('is enabled when secret key is set', () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');

    expect(isTurnstileEnabled()).toBe(true);
  });

  it('skips verification when turnstile is disabled', async () => {
    vi.stubEnv('TURNSTILE_ENABLED', 'false');

    const result = await verifyTurnstileToken(null);

    expect(result).toEqual({ ok: true });
  });

  it('rejects missing token when turnstile is enabled', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');

    const result = await verifyTurnstileToken('');

    expect(result.ok).toBe(false);
  });

  it('verifies token with Cloudflare siteverify API', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await verifyTurnstileToken('token-123', '203.0.113.1');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' })
    );

    const body = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get('secret')).toBe('secret');
    expect(body.get('response')).toBe('token-123');
    expect(body.get('remoteip')).toBe('203.0.113.1');
  });

  it('extracts client IP from x-forwarded-for', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.2' },
    });

    expect(getRequestClientIp(request)).toBe('203.0.113.1');
  });
});
