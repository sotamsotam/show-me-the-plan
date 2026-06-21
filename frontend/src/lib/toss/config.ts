export function getTossClientKey(): string {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim();

  if (!clientKey) {
    throw new Error('NEXT_PUBLIC_TOSS_CLIENT_KEY is not configured.');
  }

  return clientKey;
}

export function getTossSecretKey(): string {
  const secretKey = process.env.TOSS_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error('TOSS_SECRET_KEY is not configured.');
  }

  return secretKey;
}

export function isTossConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() &&
      process.env.TOSS_SECRET_KEY?.trim()
  );
}

export const TOSS_API_BASE = 'https://api.tosspayments.com';
