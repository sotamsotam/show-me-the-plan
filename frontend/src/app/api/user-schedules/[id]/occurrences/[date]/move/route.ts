import { appendStudentUserIdToPath } from '@/lib/api-student-query';
import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import {
  buildWeeklyScheduleMovePayload,
  validateOccurrenceMoveTarget,
} from '@/lib/user-schedule-occurrence';
import type { UserSchedule } from '@/lib/user-schedule';
import { NextRequest, NextResponse } from 'next/server';

function parseError(data: { error?: { message?: string } | string }, fallback: string) {
  if (typeof data.error === 'string') {
    return data.error;
  }

  return data.error?.message ?? fallback;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; date: string } }
) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const fromDate = params.date.slice(0, 10);
  const body = await request.json();
  const toDate = String(body.toDate ?? '').slice(0, 10);
  const rangeStart = fromDate < toDate ? fromDate : toDate;
  const rangeEndBase = fromDate > toDate ? fromDate : toDate;
  const rangeEndDate = new Date(`${rangeEndBase}T12:00:00`);
  rangeEndDate.setDate(rangeEndDate.getDate() + 1);
  const rangeEnd = rangeEndDate.toISOString().slice(0, 10);

  const listRes = await strapiFetch(
    appendStudentUserIdToPath(
      `/api/user-schedules?start=${rangeStart}&end=${rangeEnd}`,
      request
    ),
    { jwt }
  );
  const listData = await listRes.json();

  if (!listRes.ok) {
    return NextResponse.json(
      { error: parseError(listData, '일정을 불러오지 못했습니다.') },
      { status: listRes.status }
    );
  }

  const schedule = (listData.schedules as UserSchedule[] | undefined)?.find(
    (item) => item.id === Number(params.id)
  );

  if (!schedule) {
    return NextResponse.json({ error: '일정을 찾을 수 없습니다.' }, { status: 404 });
  }

  const moveError = validateOccurrenceMoveTarget(schedule, fromDate, toDate);
  if (moveError) {
    return NextResponse.json({ error: moveError }, { status: 400 });
  }

  const payload = buildWeeklyScheduleMovePayload(schedule, fromDate, toDate, {
    title: String(body.title ?? schedule.title),
    startTime: String(body.startTime),
    endTime: String(body.endTime),
  });

  const res = await strapiFetch(
    appendStudentUserIdToPath(`/api/user-schedules/${params.id}`, request),
    {
      method: 'PUT',
      jwt,
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseError(data, '이 날짜 일정 이동에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
