import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, password, passwordConfirmation } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: '유효하지 않은 재설정 링크입니다.' }, { status: 400 });
    }

    if (!password || !passwordConfirmation) {
      return NextResponse.json(
        { error: '새 비밀번호와 비밀번호 확인은 필수입니다.' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: '새 비밀번호는 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    if (password !== passwordConfirmation) {
      return NextResponse.json({ error: '새 비밀번호가 일치하지 않습니다.' }, { status: 400 });
    }

    const res = await fetch(`${STRAPI_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, password, passwordConfirmation }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message ??
            (typeof data.error === 'string' ? data.error : null) ??
            '비밀번호 재설정에 실패했습니다. 링크가 만료되었을 수 있습니다.',
        },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: '비밀번호 재설정에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
