import { TURNSTILE_VERIFICATION_FAILED_MESSAGE } from '@/lib/turnstile-client';

export { TURNSTILE_VERIFICATION_FAILED_MESSAGE } from '@/lib/turnstile-client';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type TurnstileSiteverifyResponse = {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
};

export function isTurnstileEnabled(): boolean {
  if (process.env.TURNSTILE_ENABLED === 'false') {
    return false;
  }

  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isTurnstileEnabled()) {
    return { ok: true };
  }

  if (!token?.trim()) {
    return { ok: false, message: TURNSTILE_VERIFICATION_FAILED_MESSAGE };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { ok: false, message: TURNSTILE_VERIFICATION_FAILED_MESSAGE };
  }

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
  });

  if (remoteIp?.trim()) {
    body.set('remoteip', remoteIp.trim());
  }

  let data: TurnstileSiteverifyResponse;

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    });

    data = (await res.json()) as TurnstileSiteverifyResponse;
  } catch {
    return { ok: false, message: TURNSTILE_VERIFICATION_FAILED_MESSAGE };
  }

  if (!data.success) {
    return { ok: false, message: TURNSTILE_VERIFICATION_FAILED_MESSAGE };
  }

  return { ok: true };
}

export function getRequestClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  return realIp || null;
}
