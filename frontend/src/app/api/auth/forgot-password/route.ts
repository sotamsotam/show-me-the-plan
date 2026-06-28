import { NextResponse } from 'next/server';
import {
  getRequestClientIp,
  verifyTurnstileToken,
} from '@/lib/turnstile';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

const SUCCESS_MESSAGE =
  '등록된 이메일이면 비밀번호 재설정 안내 메일을 보냈습니다. 메일함을 확인해 주세요.';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, turnstileToken } = body;

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

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: '이메일은 필수입니다.' }, { status: 400 });
    }

    const res = await fetch(`${STRAPI_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            data.error?.message ??
            (typeof data.error === 'string' ? data.error : null) ??
            '요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, message: SUCCESS_MESSAGE });
  } catch {
    return NextResponse.json(
      { error: '요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
