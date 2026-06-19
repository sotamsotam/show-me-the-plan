import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

function extractStrapiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const record = data as Record<string, unknown>;
  const error = record.error;

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return fallback;
}

export async function POST(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: '요청 형식이 올바르지 않습니다.' },
      { status: 400 }
    );
  }

  const { password } = body;

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: '비밀번호는 필수입니다.' }, { status: 400 });
  }

  const res = await strapiFetch('/api/user-profiles/me/withdraw', {
    method: 'POST',
    jwt,
    body: JSON.stringify({ password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { error: extractStrapiError(data, '회원 탈퇴에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json({ success: true });
}
