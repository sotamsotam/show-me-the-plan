import { getTossSecretKey, TOSS_API_BASE } from '@/lib/toss/config';

type TossErrorResponse = {
  code?: string;
  message?: string;
};

async function parseTossResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & TossErrorResponse;

  if (!res.ok) {
    throw new Error(data.message ?? '토스페이먼츠 API 호출에 실패했습니다.');
  }

  return data;
}

function getAuthorizationHeader(): string {
  const secretKey = getTossSecretKey();
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

export type TossBillingKeyIssueResponse = {
  billingKey: string;
  customerKey: string;
  authenticatedAt?: string;
  method?: string;
};

export type TossBillingPaymentResponse = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  receipt?: {
    url?: string;
  };
};

export async function issueBillingKey(input: {
  authKey: string;
  customerKey: string;
}): Promise<TossBillingKeyIssueResponse> {
  const res = await fetch(`${TOSS_API_BASE}/v1/billing/authorizations/issue`, {
    method: 'POST',
    headers: {
      Authorization: getAuthorizationHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authKey: input.authKey,
      customerKey: input.customerKey,
    }),
  });

  return parseTossResponse<TossBillingKeyIssueResponse>(res);
}

export async function chargeBillingKey(input: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerEmail?: string;
}): Promise<TossBillingPaymentResponse> {
  const res = await fetch(
    `${TOSS_API_BASE}/v1/billing/${encodeURIComponent(input.billingKey)}`,
    {
      method: 'POST',
      headers: {
        Authorization: getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey: input.customerKey,
        amount: input.amount,
        orderId: input.orderId,
        orderName: input.orderName,
        customerEmail: input.customerEmail,
        taxFreeAmount: 0,
      }),
    }
  );

  return parseTossResponse<TossBillingPaymentResponse>(res);
}
