export const PORTONE_API_BASE = 'https://api.portone.io';

export function getPortOneApiSecret(): string {
  const secret = process.env.PORTONE_API_SECRET?.trim();

  if (!secret) {
    throw new Error('PORTONE_API_SECRET is not configured.');
  }

  return secret;
}

export function getPortOneStoreId(): string {
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID?.trim();

  if (!storeId) {
    throw new Error('NEXT_PUBLIC_PORTONE_STORE_ID is not configured.');
  }

  return storeId;
}

export function getPortOneChannelKey(): string {
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY?.trim();

  if (!channelKey) {
    throw new Error('NEXT_PUBLIC_PORTONE_CHANNEL_KEY is not configured.');
  }

  return channelKey;
}

export function isPortOneConfigured(): boolean {
  return Boolean(
    process.env.PORTONE_API_SECRET?.trim() &&
      process.env.NEXT_PUBLIC_PORTONE_STORE_ID?.trim() &&
      process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY?.trim()
  );
}

export function getPortOneAuthorizationHeader(): string {
  return `PortOne ${getPortOneApiSecret()}`;
}

export function getPortOneWebhookSecret(): string {
  const secret = process.env.PORTONE_WEBHOOK_SECRET?.trim();

  if (!secret) {
    throw new Error('PORTONE_WEBHOOK_SECRET is not configured.');
  }

  return secret;
}

export function isPortOneWebhookVerifyEnabled(): boolean {
  return process.env.PORTONE_WEBHOOK_SKIP_VERIFY !== 'true';
}
