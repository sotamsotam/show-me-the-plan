import { requireStudentBillingSession } from '@/lib/billing/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await requireStudentBillingSession(request);

  if (!session) {
    return NextResponse.json(
      { error: '학생 계정으로 로그인해야 조회할 수 있습니다.' },
      { status: 403 }
    );
  }

  const res = await strapiFetch('/api/subscriptions/payment-history', {
    jwt: session.jwt,
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? '결제 내역 조회에 실패했습니다.' },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
