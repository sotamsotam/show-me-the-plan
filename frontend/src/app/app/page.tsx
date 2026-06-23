import { authOptions } from '@/lib/auth';
import { getDefaultDashboardPathFromSession } from '@/lib/account-helpers';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppEntryPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect(getDefaultDashboardPathFromSession(session.user));
  }

  redirect('/login');
}
