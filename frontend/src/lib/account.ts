import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import type { AccountInfo } from '@/types/school';
import type { NextRequest } from 'next/server';

export { getAccountFlags, getDefaultDashboardPath } from '@/lib/account-helpers';

export async function fetchAccountInfo(
  jwt?: string | null,
  request?: NextRequest
): Promise<AccountInfo | null> {
  const token = jwt ?? (await getServerStrapiJwt(request));

  if (!token) {
    return null;
  }

  const res = await strapiFetch('/api/user-profiles/me', { jwt: token });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return {
    user: data.user ?? null,
    role: data.role ?? null,
    profile: data.profile ?? null,
    subscription: data.subscription ?? null,
  };
}
