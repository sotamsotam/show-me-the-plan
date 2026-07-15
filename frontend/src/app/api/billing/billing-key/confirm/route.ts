import { completeBillingCheckout } from '@/lib/billing/checkout';
import {
  buildCustomerKey,
  requireStudentBillingSession,
} from '@/lib/billing/auth';
import { recordPaidServiceConsentInternal } from '@/lib/billing/strapi-internal';
import { isPortOneConfigured } from '@/lib/portone/config';
import { strapiFetch } from '@/lib/strapi';
import { LEGAL_VERSIONS } from '@/content/legal/meta';
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

  if (!isPortOneConfigured()) {
    return NextResponse.json(
      { error: '결제 설정이 완료되지 않았습니다.' },
      { status: 503 }
    );
  }

  const body = (await request.json()) as {
    billingKey?: string;
    planCode?: string;
    paymentId?: string;
    paidServiceAgreed?: boolean;
    paidServiceVersion?: string;
  };

  if (!body.billingKey) {
    return NextResponse.json({ error: 'billingKey가 필요합니다.' }, { status: 400 });
  }

  if (!body.paidServiceAgreed) {
    return NextResponse.json(
      { error: '유료서비스 이용약관에 동의해 주세요.' },
      { status: 400 }
    );
  }

  const paidServiceVersion = body.paidServiceVersion ?? LEGAL_VERSIONS.paidService;

  if (paidServiceVersion !== LEGAL_VERSIONS.paidService) {
    return NextResponse.json(
      { error: '유료서비스 이용약관 버전이 올바르지 않습니다.' },
      { status: 400 }
    );
  }

  const planCode = body.planCode ?? DEFAULT_MONTHLY_PLAN_CODE;

  const plansRes = await strapiFetch('/api/plans/active');
  const plansData = await plansRes.json();
  const plan = (plansData.plans ?? []).find(
    (item: { code: string; name: string }) => item.code === planCode
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

  const breakdown = subscriptionData.subscription?.nextBilling ?? {
    planPrice: plan.price,
    discountAmount: 0,
    pointAmountUsed: 0,
    billedAmount: plan.price,
    skipPgCharge: false,
  };

  try {
    await recordPaidServiceConsentInternal({
      userId: session.userId,
      paidServiceAgreed: true,
      paidServiceVersion,
    });

    const result = await completeBillingCheckout({
      userId: session.userId,
      planCode,
      planName: plan.name,
      customerKey: buildCustomerKey(session.userId),
      billingKey: body.billingKey,
      email: session.email,
      breakdown,
      paymentId: body.paymentId,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : '결제 처리에 실패했습니다.',
      },
      { status: 502 }
    );
  }
}
