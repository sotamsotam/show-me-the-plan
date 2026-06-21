import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import OpsNav from '@/components/ops/OpsNav';
import { authOptions } from '@/lib/auth';

export default async function OpsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login?callbackUrl=/ops');
  }

  if (!session.user.isOperator) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <OpsNav username={session.user.username} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
