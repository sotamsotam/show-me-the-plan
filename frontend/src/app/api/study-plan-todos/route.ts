import { appendStudentUserIdToParams } from '@/lib/api-student-query';
import { getServerStrapiJwt } from '@/lib/auth';
import { expandedEventsToCalendarEvents } from '@/lib/study-plan-todo';
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
  const include = request.nextUrl.searchParams.get('include');

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

  if (include) {
    params.set('include', include);
  }
  const res = await strapiFetch(`/api/study-plan-todos?${params}`, { jwt });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseError(data, '스터디 플랜 조회에 실패했습니다.') },
      { status: res.status }
    );
  }

  const rawEvents = data.events ?? [];

  return NextResponse.json({
    todos: data.todos ?? [],
    events: expandedEventsToCalendarEvents(rawEvents),
    expandedEvents: rawEvents,
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
    postQuery ? `/api/study-plan-todos?${postQuery}` : '/api/study-plan-todos',
    {
      method: 'POST',
      jwt,
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseError(data, '스터디 플랜 등록에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
