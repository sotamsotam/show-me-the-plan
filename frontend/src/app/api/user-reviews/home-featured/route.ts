import { parseUserReviewError } from '@/lib/user-review';
import { strapiFetch } from '@/lib/strapi';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const res = await strapiFetch('/api/user-reviews/home-featured');
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      {
        error: parseUserReviewError(
          data,
          '홈 노출 사용후기를 불러오지 못했습니다.'
        ),
      },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
