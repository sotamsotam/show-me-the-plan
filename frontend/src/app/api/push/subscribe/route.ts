import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

interface PushSubscribeBody {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export async function POST(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = (await request.json()) as PushSubscribeBody;

  if (!body.endpoint?.trim() || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json(
      { error: 'endpoint와 keys(p256dh, auth)가 필요합니다.' },
      { status: 400 }
    );
  }

  const res = await strapiFetch('/api/push-subscriptions/subscribe', {
    method: 'POST',
    jwt,
    body: JSON.stringify({
      endpoint: body.endpoint.trim(),
      keys: {
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          data.error?.message ??
          (typeof data.error === 'string' ? data.error : null) ??
          '푸시 구독 등록에 실패했습니다.',
      },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
