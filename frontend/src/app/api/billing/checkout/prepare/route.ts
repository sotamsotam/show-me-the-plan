import {
  buildCustomerKey,
  createBillingOrderId,
  requireStudentBillingSession,
} from '@/lib/billing/auth';
import { fetchAccountInfo } from '@/lib/account';
import { getTossClientKey, isTossConfigured } from '@/lib/toss/config';
import { strapiFetch } from '@/lib/strapi';
import { DEFAULT_MONTHLY_PLAN_CODE } from '@/types/subscription';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const session = await requireStudentBillingSession(request);

  if (!session) {
    return NextResponse.json(
      { error: '학생 계정으로 로그인해야 결제할 수 있습니다.' },
      { status: 403 }
    );
  }

  if (!isTossConfigured()) {
    return NextResponse.json(
      { error: '결제 설정이 완료되지 않았습니다.' },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { planCode?: string };
  const planCode = body.planCode ?? DEFAULT_MONTHLY_PLAN_CODE;

  const account = await fetchAccountInfo(session.jwt);

  if (!account?.profile?.guardianConsentConfirmedAt) {
    return NextResponse.json(
      {
        error:
          '법정대리인 동의 정보가 없어 결제를 진행할 수 없습니다. 가입 동의 절차를 확인해 주세요.',
        guardianConsentConfirmed: false,
      },
      { status: 403 }
    );
  }

  const plansRes = await strapiFetch('/api/plans/active');
  const plansData = await plansRes.json();

  if (!plansRes.ok) {
    return NextResponse.json(
      { error: '요금제 조회에 실패했습니다.' },
      { status: 500 }
    );
  }

  const plan = (plansData.plans ?? []).find(
    (item: { code: string }) => item.code === planCode
  );

  if (!plan) {
    return NextResponse.json({ error: '유효하지 않은 요금제입니다.' }, { status: 400 });
  }

  const subscriptionRes = await strapiFetch('/api/subscriptions/me', {
    jwt: session.jwt,
  });
  const subscriptionData = await subscriptionRes.json();

  if (!subscriptionRes.ok) {
    return NextResponse.json(
      { error: '구독 정보 조회에 실패했습니다.' },
      { status: 500 }
    );
  }

  const nextBilling = subscriptionData.subscription?.nextBilling ?? {
    planPrice: plan.price,
    discountAmount: 0,
    billedAmount: plan.price,
    skipPgCharge: false,
  };

  const customerKey = buildCustomerKey(session.userId);
  const orderId = createBillingOrderId(session.userId);

  return NextResponse.json({
    clientKey: getTossClientKey(),
    customerKey,
    orderId,
    plan: {
      code: plan.code,
      name: plan.name,
      price: plan.price,
      interval: plan.interval,
    },
    nextBilling,
    guardianConsentConfirmed: true,
    successUrl: `${process.env.NEXTAUTH_URL}/billing/checkout/success`,
    failUrl: `${process.env.NEXTAUTH_URL}/billing/checkout/fail`,
  });
}
