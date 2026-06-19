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
  const res = await strapiFetch(`/api/user-profiles/vacation-period-settings?${params}`, {
    jwt,
  });
  const data = await res.json();

  if (!res.ok) {
    const rawError =
      data.error?.message ??
      (typeof data.error === 'string' ? data.error : null);
    const errorMessage =
      res.status === 403 && rawError === 'Forbidden'
        ? '방학기간 설정 API 권한이 없습니다. 백엔드 서버를 재시작한 뒤 다시 시도해 주세요.'
        : (rawError ?? '방학기간 설정을 불러오지 못했습니다.');

    return NextResponse.json({ error: errorMessage }, { status: res.status });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const res = await strapiFetch('/api/user-profiles/vacation-period-settings', {
    method: 'PUT',
    jwt,
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (!res.ok) {
    const rawError =
      data.error?.message ??
      (typeof data.error === 'string' ? data.error : null);
    const errorMessage =
      res.status === 403 && rawError === 'Forbidden'
        ? '방학기간 설정 API 권한이 없습니다. 백엔드 서버를 재시작한 뒤 다시 시도해 주세요.'
        : (rawError ?? '방학기간 설정 저장에 실패했습니다.');

    return NextResponse.json({ error: errorMessage }, { status: res.status });
  }

  return NextResponse.json(data);
}
