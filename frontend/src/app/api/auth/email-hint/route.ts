import { NextResponse } from 'next/server';
import {
  getRequestClientIp,
  verifyTurnstileToken,
} from '@/lib/turnstile';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, turnstileToken } = body;

    const turnstileResult = await verifyTurnstileToken(
      turnstileToken,
      getRequestClientIp(request)
    );
    if (!turnstileResult.ok) {
      return NextResponse.json(
        { error: turnstileResult.message },
        { status: 400 }
      );
    }

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: '닉네임은 필수입니다.' }, { status: 400 });
    }

    const res = await fetch(`${STRAPI_URL}/api/user-profiles/email-hint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim() }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message ??
            (typeof data.error === 'string' ? data.error : null) ??
            '입력하신 닉네임과 일치하는 계정을 찾을 수 없습니다.',
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      maskedEmail: data.maskedEmail,
    });
  } catch {
    return NextResponse.json(
      { error: '요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
