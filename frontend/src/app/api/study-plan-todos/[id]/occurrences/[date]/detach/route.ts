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

export async function POST(
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
      `/api/study-plan-todos/${params.id}/occurrences/${params.date}/detach`,
      request
    ),
    {
      method: 'POST',
      jwt,
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();

  if (!res.ok) {
    const message =
      res.status === 403
        ? '이 날짜 스터디 플랜 분리 권한이 없습니다. 백엔드 서버를 재시작한 뒤 다시 시도해 주세요.'
        : parseError(data, '이 날짜 스터디 플랜 분리에 실패했습니다.');

    return NextResponse.json({ error: message }, { status: res.status });
  }

  return NextResponse.json(data);
}
