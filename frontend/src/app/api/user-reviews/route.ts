import { parseUserReviewError } from '@/lib/user-review';
import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const res = await strapiFetch('/api/user-reviews');
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseUserReviewError(data, '사용후기 목록을 불러오지 못했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const res = await strapiFetch('/api/user-reviews', {
    method: 'POST',
    jwt,
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseUserReviewError(data, '사용후기 작성에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
