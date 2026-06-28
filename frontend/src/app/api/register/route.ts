import { NextResponse } from 'next/server';
import {
  getRequestClientIp,
  verifyTurnstileToken,
} from '@/lib/turnstile';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password, profile, consents, turnstileToken } =
      body;

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

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'username, email, password는 필수입니다.' },
        { status: 400 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: '프로필 정보는 필수입니다.' },
        { status: 400 }
      );
    }

    if (!consents) {
      return NextResponse.json(
        { error: '가입 동의 정보는 필수입니다.' },
        { status: 400 }
      );
    }

    const isManagerSignup = profile.schoolLevel === 'manager';
    const isOtherStudentSignup = profile.schoolLevel === 'other';

    if (!isManagerSignup && !isOtherStudentSignup) {
      const requiredFields = [
        'schoolLevel',
        'atptOfcdcScCode',
        'sdSchulCode',
        'schoolName',
        'grade',
        'className',
      ];

      for (const field of requiredFields) {
        if (!profile[field]) {
          return NextResponse.json(
            { error: '학교 정보는 필수입니다.' },
            { status: 400 }
          );
        }
      }
    }

    const res = await fetch(`${STRAPI_URL}/api/user-profiles/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, profile, consents }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message ??
            (typeof data.error === 'string' ? data.error : null) ??
            '회원가입에 실패했습니다.',
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        username: data.user.username,
      },
    });
  } catch {
    return NextResponse.json(
      { error: '회원가입에 실패했습니다.' },
      { status: 500 }
    );
  }
}
