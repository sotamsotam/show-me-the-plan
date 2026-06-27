import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

function readErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const rawError =
    (data.error as { message?: string } | undefined)?.message ??
    (typeof data.error === 'string' ? data.error : null);

  return rawError ?? fallback;
}

export async function POST(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const res = await strapiFetch('/api/user-profiles/exam-prep-weekly-plan-items/carry-over', {
    method: 'POST',
    jwt,
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: readErrorMessage(data, '공부 계획 이월에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const res = await strapiFetch('/api/user-profiles/exam-prep-weekly-plan-items', {
    method: 'DELETE',
    jwt,
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: readErrorMessage(data, '공부 계획 항목 삭제에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
