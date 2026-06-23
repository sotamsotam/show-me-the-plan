import { appendStudentUserIdToParams } from '@/lib/api-student-query';
import { getServerStrapiJwt } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

function parseError(data: { error?: { message?: string } | string }, fallback: string) {
  if (typeof data.error === 'string') {
    return data.error;
  }

  return data.error?.message ?? fallback;
}

export async function POST(request: NextRequest) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const incoming = await request.formData();
  const file = incoming.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file이 필요합니다.' }, { status: 400 });
  }

  const outbound = new FormData();
  outbound.append('file', file, file.name);

  const params = appendStudentUserIdToParams(new URLSearchParams(), request);
  const query = params.toString();
  const path = query
    ? `/api/user-schedules/attachments/upload?${query}`
    : '/api/user-schedules/attachments/upload';

  const res = await fetch(`${STRAPI_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: outbound,
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: parseError(data, '이미지 업로드에 실패했습니다.') },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
