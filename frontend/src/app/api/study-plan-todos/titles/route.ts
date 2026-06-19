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

  const q = request.nextUrl.searchParams.get('q') ?? '';
  const subject = request.nextUrl.searchParams.get('subject') ?? '';
  const params = appendStudentUserIdToParams(new URLSearchParams(), request);

  if (q.trim()) {
    params.set('q', q.trim());
  }

  if (subject.trim()) {
    params.set('subject', subject.trim());
  }

  const query = params.toString();
  const res = await strapiFetch(
    query ? `/api/study-plan-todos/titles?${query}` : '/api/study-plan-todos/titles',
    { jwt }
  );
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseError(data, '스터디 플랜 제목 조회에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json({ titles: data.titles ?? [] });
}
