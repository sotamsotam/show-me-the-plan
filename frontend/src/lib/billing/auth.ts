import { fetchAccountInfo } from '@/lib/account';
import { getServerStrapiJwt } from '@/lib/auth';
import { isAnyStudent } from '@/types/school';
import type { NextRequest } from 'next/server';

export type StudentBillingSession = {
  jwt: string;
  userId: number;
  email: string;
  username: string;
};

export async function requireStudentBillingSession(
  request: NextRequest
): Promise<StudentBillingSession | null> {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return null;
  }

  const account = await fetchAccountInfo(jwt);

  if (!account?.user?.id || !isAnyStudent(account.profile?.schoolLevel)) {
    return null;
  }

  return {
    jwt,
    userId: account.user.id,
    email: account.user.email,
    username: account.user.username,
  };
}

export function buildCustomerKey(userId: number): string {
  return `student-${userId}`;
}

export function createBillingOrderId(userId: number): string {
  return `smp-${userId}-${Date.now()}`;
}

export function parseUserIdFromPaymentId(paymentId?: string): number | null {
  if (!paymentId) {
    return null;
  }

  const match = paymentId.match(/^smp-(\d+)-/);
  return match ? Number(match[1]) : null;
}
