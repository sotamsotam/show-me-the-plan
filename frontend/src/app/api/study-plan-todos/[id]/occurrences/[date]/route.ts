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
  { params }: { params: { id: string; date: string } }
) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const res = await strapiFetch(
    appendStudentUserIdToPath(
      `/api/study-plan-todos/${params.id}/occurrences/${params.date}`,
      request
    ),
    {
      method: 'PUT',
      jwt,
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseError(data, '이 날짜 스터디 플랜 수정에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; date: string } }
) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const res = await strapiFetch(
    appendStudentUserIdToPath(
      `/api/study-plan-todos/${params.id}/occurrences/${params.date}`,
      request
    ),
    {
      method: 'DELETE',
      jwt,
    }
  );
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseError(data, '이 날짜 스터디 플랜 삭제에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
