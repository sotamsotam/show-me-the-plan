import {
  getPortOneAuthorizationHeader,
  getPortOneStoreId,
  PORTONE_API_BASE,
} from '@/lib/portone/config';

type PortOneErrorResponse = {
  type?: string;
  message?: string;
};

export type PortOneBillingKeyInfo = {
  billingKey: string;
  customer?: {
    id?: string;
  };
  status?: string;
  issuedAt?: string;
};

export type PortOnePayment = {
  id?: string;
  status?: string;
  amount?: {
    total?: number;
  };
  receiptUrl?: string;
  customer?: {
    id?: string;
  };
};

export type PortOneBillingPaymentResponse = {
  paymentId: string;
  status: string;
  totalAmount: number;
  receiptUrl?: string | null;
  customerId?: string | null;
};

async function parsePortOneResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & PortOneErrorResponse;

  if (!res.ok) {
    throw new Error(data.message ?? '포트원 API 호출에 실패했습니다.');
  }

  return data;
}

function toBillingPaymentResponse(
  paymentId: string,
  payment: PortOnePayment
): PortOneBillingPaymentResponse {
  return {
    paymentId: payment.id ?? paymentId,
    status: payment.status ?? 'UNKNOWN',
    totalAmount: payment.amount?.total ?? 0,
    receiptUrl: payment.receiptUrl ?? null,
    customerId: payment.customer?.id ?? null,
  };
}

function normalizeBillingKeyInfo(data: {
  billingKeyInfo?: PortOneBillingKeyInfo;
} & PortOneBillingKeyInfo): PortOneBillingKeyInfo | null {
  const info = data.billingKeyInfo ?? data;

  return info?.billingKey ? info : null;
}

export async function getBillingKey(
  billingKey: string
): Promise<PortOneBillingKeyInfo> {
  const storeId = getPortOneStoreId();
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';

  const res = await fetch(
    `${PORTONE_API_BASE}/billing-keys/${encodeURIComponent(billingKey)}${query}`,
    {
      method: 'GET',
      headers: {
        Authorization: getPortOneAuthorizationHeader(),
      },
    }
  );

  const data = await parsePortOneResponse<
    PortOneBillingKeyInfo & { billingKeyInfo?: PortOneBillingKeyInfo }
  >(res);

  const info = normalizeBillingKeyInfo(data);

  if (!info) {
    throw new Error('빌링키 정보를 찾을 수 없습니다.');
  }

  return info;
}

export async function getPayment(paymentId: string): Promise<PortOnePayment> {
  const res = await fetch(
    `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: getPortOneAuthorizationHeader(),
      },
    }
  );

  return parsePortOneResponse<PortOnePayment>(res);
}

export async function payWithBillingKey(input: {
  paymentId: string;
  billingKey: string;
  orderName: string;
  customerId: string;
  customerEmail?: string;
  amount: number;
}): Promise<PortOneBillingPaymentResponse> {
  const res = await fetch(
    `${PORTONE_API_BASE}/payments/${encodeURIComponent(input.paymentId)}/billing-key`,
    {
      method: 'POST',
      headers: {
        Authorization: getPortOneAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billingKey: input.billingKey,
        orderName: input.orderName,
        customer: {
          id: input.customerId,
          ...(input.customerEmail
            ? { email: input.customerEmail }
            : {}),
        },
        amount: {
          total: input.amount,
        },
        currency: 'KRW',
      }),
    }
  );

  const payment = await parsePortOneResponse<PortOnePayment>(res);

  return toBillingPaymentResponse(input.paymentId, payment);
}
