import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = (await request.json()) as { enabled?: unknown };

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled(boolean)는 필수입니다.' }, { status: 400 });
  }

  const res = await strapiFetch('/api/user-profiles/me/notifications', {
    method: 'PUT',
    jwt,
    body: JSON.stringify({ enabled: body.enabled }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          data.error?.message ??
          (typeof data.error === 'string' ? data.error : null) ??
          '알림 설정 저장에 실패했습니다.',
      },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
