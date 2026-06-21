const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

function getBillingInternalSecret(): string {
  const secret = process.env.BILLING_INTERNAL_SECRET?.trim();

  if (!secret) {
    throw new Error('BILLING_INTERNAL_SECRET is not configured.');
  }

  return secret;
}

async function billingInternalFetch(path: string, init?: RequestInit) {
  return fetch(`${STRAPI_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-billing-internal-secret': getBillingInternalSecret(),
      ...(init?.headers ?? {}),
    },
  });
}

export async function notifyPaymentSucceeded(body: {
  userId: number;
  planCode: string;
  pgPaymentId: string;
  planPrice: number;
  discountAmount: number;
  amount: number;
  receiptUrl?: string | null;
  pgBillingKey?: string | null;
  pgCustomerId?: string | null;
}) {
  const res = await billingInternalFetch('/api/subscriptions/internal/payment-succeeded', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message ?? '결제 성공 상태 저장에 실패했습니다.');
  }
}

export async function notifyPaymentFailed(body: {
  userId: number;
  pgPaymentId?: string;
}) {
  const res = await billingInternalFetch('/api/subscriptions/internal/payment-failed', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message ?? '결제 실패 상태 저장에 실패했습니다.');
  }
}

export async function saveBillingKeyInternal(body: {
  userId: number;
  planCode: string;
  billingKey: string;
  customerKey: string;
}) {
  const res = await billingInternalFetch('/api/subscriptions/internal/save-billing-key', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message ?? '빌링키 저장에 실패했습니다.');
  }
}

export async function grantFreePeriodInternal(body: {
  userId: number;
  planCode: string;
}) {
  const res = await billingInternalFetch('/api/subscriptions/internal/grant-free-period', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message ?? '무료 구독 연장에 실패했습니다.');
  }
}

export type RenewalCandidate = {
  userId: number;
  subscriptionId: number;
  planCode: string;
  customerKey: string;
  billingKey: string;
  breakdown: {
    planPrice: number;
    discountAmount: number;
    billedAmount: number;
    skipPgCharge: boolean;
  };
  orderName: string;
};

export async function listRenewalCandidates(): Promise<RenewalCandidate[]> {
  const res = await billingInternalFetch('/api/subscriptions/internal/renewal-candidates');

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message ?? '갱신 대상 조회에 실패했습니다.');
  }

  const data = (await res.json()) as { candidates?: RenewalCandidate[] };
  return data.candidates ?? [];
}
