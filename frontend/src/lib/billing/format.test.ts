import { describe, expect, it } from 'vitest';
import {
  formatKrw,
  formatPaymentStatus,
  formatSubscriptionStatus,
} from './format';

describe('billing format helpers', () => {
  it('formats subscription status in Korean', () => {
    expect(formatSubscriptionStatus('trialing')).toBe('무료 체험');
    expect(formatSubscriptionStatus('active')).toBe('구독 중');
  });

  it('formats payment status in Korean', () => {
    expect(formatPaymentStatus('succeeded')).toBe('결제 완료');
  });

  it('formats KRW amounts', () => {
    expect(formatKrw(4900)).toBe('4,900원');
  });
});
