import { appendStudentUserIdToPath } from '@/lib/api-student-query';
import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

function parseError(data: { error?: { message?: string } | string }, fallback: string) {
  if (typeof data.error === 'string') {
    return data.error;
  }

  return data.error?.message ?? fallback;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ date: string }> }
) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const params = await context.params;
  const date = params.date?.slice(0, 10);

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: '유효한 date가 필요합니다.' }, { status: 400 });
  }

  const body = (await request.json()) as { message?: string };
  const path = appendStudentUserIdToPath(`/api/todo-day-stamps/${date}`, request);
  const res = await strapiFetch(path, {
    jwt,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: body.message ?? '' }),
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseError(data, '확인도장 저장에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
