import { parseUserReviewError } from '@/lib/user-review';
import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const res = await strapiFetch(`/api/user-reviews/${params.id}`, {
    method: 'PUT',
    jwt,
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseUserReviewError(data, '사용후기 수정에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const res = await strapiFetch(`/api/user-reviews/${params.id}`, {
    method: 'DELETE',
    jwt,
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseUserReviewError(data, '사용후기 삭제에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
