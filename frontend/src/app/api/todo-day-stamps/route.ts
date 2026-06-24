import { appendStudentUserIdToParams } from '@/lib/api-student-query';
import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

function parseError(data: { error?: { message?: string } | string }, fallback: string) {
  if (typeof data.error === 'string') {
    return data.error;
  }

  return data.error?.message ?? fallback;
}

export async function GET(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const start = request.nextUrl.searchParams.get('start');
  const end = request.nextUrl.searchParams.get('end');

  if (!start || !end) {
    return NextResponse.json(
      { error: 'start, end 파라미터가 필요합니다.' },
      { status: 400 }
    );
  }

  const params = appendStudentUserIdToParams(
    new URLSearchParams({ start, end }),
    request
  );
  const res = await strapiFetch(`/api/todo-day-stamps?${params}`, { jwt });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseError(data, '확인도장 조회에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
