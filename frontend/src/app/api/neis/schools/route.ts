import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.toString();

  const res = await fetch(`${STRAPI_URL}/api/neis/schools?${query}`, {
    cache: 'no-store',
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? data.error ?? '학교 검색에 실패했습니다.' },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
