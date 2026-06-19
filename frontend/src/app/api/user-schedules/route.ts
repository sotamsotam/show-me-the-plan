import { appendStudentUserIdToParams } from '@/lib/api-student-query';
import { getServerStrapiJwt } from '@/lib/auth';
import { expandedEventsToCalendarEvents } from '@/lib/user-schedule';
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
  const res = await strapiFetch(`/api/user-schedules?${params}`, { jwt });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseError(data, '일정 조회에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json({
    schedules: data.schedules ?? [],
    events: expandedEventsToCalendarEvents(data.events ?? []),
  });
}

export async function POST(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const postParams = appendStudentUserIdToParams(new URLSearchParams(), request);
  const postQuery = postParams.toString();
  const res = await strapiFetch(
    postQuery ? `/api/user-schedules?${postQuery}` : '/api/user-schedules',
    {
      method: 'POST',
      jwt,
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseError(data, '일정 등록에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
