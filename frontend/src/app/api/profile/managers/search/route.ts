import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q') ?? '';

  const res = await strapiFetch(
    `/api/user-profiles/managers/search?${new URLSearchParams({ q }).toString()}`,
    { jwt }
  );
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          data.error?.message ??
          (typeof data.error === 'string' ? data.error : null) ??
          '매니저 검색에 실패했습니다.',
      },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
