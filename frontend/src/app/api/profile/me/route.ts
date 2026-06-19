import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const res = await strapiFetch('/api/user-profiles/me', { jwt });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? '프로필 조회에 실패했습니다.' },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();

  const res = await strapiFetch('/api/user-profiles/me', {
    method: 'PUT',
    jwt,
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          data.error?.message ??
          (typeof data.error === 'string' ? data.error : null) ??
          '내정보 수정에 실패했습니다.',
      },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
