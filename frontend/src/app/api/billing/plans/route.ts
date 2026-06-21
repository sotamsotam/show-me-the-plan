import { strapiFetch } from '@/lib/strapi';
import { NextResponse } from 'next/server';

export async function GET() {
  const res = await strapiFetch('/api/plans/active');
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? '요금제 조회에 실패했습니다.' },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
