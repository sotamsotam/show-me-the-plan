import { redirect } from 'next/navigation';
import DashboardPageContent from '@/components/DashboardPageContent';
import { fetchAccountInfo } from '@/lib/account';
import { isAnyStudent } from '@/types/school';

export default async function DashboardPage() {
  const account = await fetchAccountInfo();

  if (isAnyStudent(account?.profile?.schoolLevel)) {
    redirect('/dashboard/todo');
  }

  return <DashboardPageContent />;
}
