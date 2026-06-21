import DashboardShell from '@/components/DashboardShell';
import DashboardPageTransition from '@/components/DashboardPageTransition';
import { fetchAccountInfo, getAccountFlags, getDefaultDashboardPath } from '@/lib/account';
import { isAnyStudent } from '@/types/school';
import DashboardAccessGuard from './DashboardAccessGuard';
import DashboardNav from './DashboardNav';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const account = await fetchAccountInfo();
  const { isPendingManager, isApprovedManager } = getAccountFlags(account);
  const defaultHomePath = getDefaultDashboardPath(account);
  const isStudent = isAnyStudent(account?.profile?.schoolLevel);

  return (
    <div className="flex h-dvh min-w-0 flex-col overflow-hidden">
      <DashboardNav
        account={account}
        isPendingManager={isPendingManager}
        isApprovedManager={isApprovedManager}
      />
      <DashboardAccessGuard
        isPendingManager={isPendingManager}
        isStudent={isStudent}
        subscription={account?.subscription}
        defaultHomePath={defaultHomePath}
      >
        <DashboardShell>
          <DashboardPageTransition>
            <div
              className={`flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 md:px-[50px] md:pb-0 ${
                isPendingManager
                  ? 'pb-[env(safe-area-inset-bottom)]'
                  : 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]'
              }`}
            >
              {children}
            </div>
          </DashboardPageTransition>
        </DashboardShell>
      </DashboardAccessGuard>
    </div>
  );
}
