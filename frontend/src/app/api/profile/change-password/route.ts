import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, password } = body;

  if (!currentPassword || !password) {
    return NextResponse.json(
      { error: '현재 비밀번호와 새 비밀번호는 필수입니다.' },
      { status: 400 }
    );
  }

  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json(
      { error: '새 비밀번호는 6자 이상이어야 합니다.' },
      { status: 400 }
    );
  }

  const res = await strapiFetch('/api/auth/change-password', {
    method: 'POST',
    jwt,
    body: JSON.stringify({ currentPassword, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          data.error?.message ??
          (typeof data.error === 'string' ? data.error : null) ??
          '비밀번호 변경에 실패했습니다.',
      },
      { status: res.status }
    );
  }

  return NextResponse.json({ success: true });
}
