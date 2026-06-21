import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

export async function requireOperatorSession() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    if (!session.user.isOperator) {
      return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    return { session };
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

export function getOpsInternalSecret(): string | null {
  const secret = process.env.OPS_INTERNAL_SECRET?.trim();
  return secret || null;
}

export async function fetchOpsInternal<T>(
  path: string,
  init?: RequestInit & { operatorLabel?: string }
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const secret = getOpsInternalSecret();
  const strapiUrl = process.env.STRAPI_URL ?? 'http://localhost:1337';
  const { operatorLabel, ...requestInit } = init ?? {};

  if (!secret) {
    return { ok: false, status: 503, error: 'Ops internal API is not configured.' };
  }

  const url = `${strapiUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...requestInit,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-ops-internal-secret': secret,
      ...(operatorLabel ? { 'x-ops-operator': operatorLabel } : {}),
      ...(requestInit.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    const message =
      body?.error?.message ?? body?.error ?? `Ops API failed (${res.status})`;
    return {
      ok: false,
      status: res.status,
      error: typeof message === 'string' ? message : 'Ops API failed',
    };
  }

  const data = (await res.json()) as T;
  return { ok: true, data };
}
