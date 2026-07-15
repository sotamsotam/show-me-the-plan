import { appendStudentUserIdToParams } from '@/lib/api-student-query';
import { getServerStrapiJwt } from '@/lib/auth';
import { timetableToCalendarEvents } from '@/lib/timetable';
import type { UserSubject } from '@/lib/user-subject';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

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
  const refresh = request.nextUrl.searchParams.get('refresh');
  if (refresh === 'true') {
    params.set('refresh', 'true');
  }
  const res = await strapiFetch(`/api/user-profiles/timetable?${params}`, { jwt });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          data.error?.message ??
          (typeof data.error === 'string' ? data.error : null) ??
          '시간표 조회에 실패했습니다.',
      },
      { status: res.status }
    );
  }

  return NextResponse.json({
    profile: data.profile ?? null,
    subjects: data.subjects ?? [],
    entries: data.entries ?? [],
    events: timetableToCalendarEvents(
      data.entries ?? [],
      data.scheduleEvents ?? data.examEvents?.map((event: { date: string; title: string; description?: string; category: string }) => ({
        ...event,
        kind: 'exam' as const,
      })) ?? [],
      data.profile?.schoolLevel ?? 'middle',
      (data.subjects as UserSubject[] | undefined) ?? undefined
    ),
  });
}
