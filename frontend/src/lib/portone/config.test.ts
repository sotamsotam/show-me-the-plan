import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  getPortOneApiSecret,
  getPortOneChannelKey,
  getPortOneStoreId,
  isPortOneConfigured,
} from './config';

describe('portone config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('detects configured portone env', () => {
    process.env.PORTONE_API_SECRET = 'test-api-secret';
    process.env.NEXT_PUBLIC_PORTONE_STORE_ID = 'store-test-id';
    process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY = 'channel-test-key';

    expect(isPortOneConfigured()).toBe(true);
  });

  it('returns false when any required env is missing', () => {
    process.env.PORTONE_API_SECRET = 'test-api-secret';
    process.env.NEXT_PUBLIC_PORTONE_STORE_ID = 'store-test-id';
    delete process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;

    expect(isPortOneConfigured()).toBe(false);
  });

  it('reads trimmed env values', () => {
    process.env.PORTONE_API_SECRET = '  test-api-secret  ';
    process.env.NEXT_PUBLIC_PORTONE_STORE_ID = ' store-test-id ';
    process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY = ' channel-test-key ';

    expect(getPortOneApiSecret()).toBe('test-api-secret');
    expect(getPortOneStoreId()).toBe('store-test-id');
    expect(getPortOneChannelKey()).toBe('channel-test-key');
  });

  it('throws when api secret is missing', () => {
    delete process.env.PORTONE_API_SECRET;

    expect(() => getPortOneApiSecret()).toThrow('PORTONE_API_SECRET');
  });
});
