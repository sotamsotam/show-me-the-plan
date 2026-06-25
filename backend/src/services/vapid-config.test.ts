import { afterEach, describe, expect, it } from 'vitest';
import { getVapidConfig, requireVapidConfig } from './vapid-config';

describe('vapid-config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns null when env vars are missing', () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;

    expect(getVapidConfig()).toBeNull();
  });

  it('returns config when env vars are set', () => {
    process.env.VAPID_PUBLIC_KEY = 'public-key';
    process.env.VAPID_PRIVATE_KEY = 'private-key';
    process.env.VAPID_SUBJECT = 'mailto:test@example.com';

    expect(getVapidConfig()).toEqual({
      publicKey: 'public-key',
      privateKey: 'private-key',
      subject: 'mailto:test@example.com',
    });
  });

  it('requireVapidConfig throws when missing', () => {
    delete process.env.VAPID_PUBLIC_KEY;
    expect(() => requireVapidConfig()).toThrow();
  });
});
