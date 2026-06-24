import { parseUserReviewError } from '@/lib/user-review';
import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const res = await strapiFetch('/api/user-reviews/mine', { jwt });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseUserReviewError(data, '내 사용후기를 불러오지 못했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
