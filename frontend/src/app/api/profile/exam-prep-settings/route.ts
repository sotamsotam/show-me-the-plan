import { appendStudentUserIdToParams } from '@/lib/api-student-query';
import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const params = appendStudentUserIdToParams(new URLSearchParams(), request);
  const res = await strapiFetch(`/api/user-profiles/exam-countdown-context?${params}`, {
    jwt,
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          data.error?.message ??
          (typeof data.error === 'string' ? data.error : null) ??
          '시험 일정 조회에 실패했습니다.',
      },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const res = await strapiFetch('/api/user-profiles/exam-prep-settings', {
    method: 'PUT',
    jwt,
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          data.error?.message ??
          (typeof data.error === 'string' ? data.error : null) ??
          '시험기간 설정 저장에 실패했습니다.',
      },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
