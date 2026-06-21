import type { SubscriptionStatus } from '@/types/subscription';

const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: '무료 체험',
  active: '구독 중',
  past_due: '결제 실패',
  canceled: '해지됨',
  expired: '만료',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  succeeded: '결제 완료',
  failed: '결제 실패',
  pending: '처리 중',
  refunded: '환불',
};

export function formatSubscriptionStatus(status: SubscriptionStatus | string): string {
  return SUBSCRIPTION_STATUS_LABEL[status as SubscriptionStatus] ?? status;
}

export function formatPaymentStatus(status: string): string {
  return PAYMENT_STATUS_LABEL[status] ?? status;
}

export function formatKrw(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function formatBillingInterval(interval: string): string {
  return interval === 'month' ? '월' : interval === 'year' ? '년' : interval;
}
