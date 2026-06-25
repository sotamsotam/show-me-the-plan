import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = (await request.json()) as { endpoint?: string };

  if (!body.endpoint?.trim()) {
    return NextResponse.json({ error: 'endpoint는 필수입니다.' }, { status: 400 });
  }

  const res = await strapiFetch('/api/push-subscriptions/unsubscribe', {
    method: 'POST',
    jwt,
    body: JSON.stringify({ endpoint: body.endpoint.trim() }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          data.error?.message ??
          (typeof data.error === 'string' ? data.error : null) ??
          '푸시 구독 해제에 실패했습니다.',
      },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
