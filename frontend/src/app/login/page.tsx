import { Suspense } from 'react';
import { authOptions } from '@/lib/auth';
import { resolvePostLoginPath } from '@/lib/account-helpers';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect(resolvePostLoginPath(session.user, searchParams?.callbackUrl));
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#092254] text-gray-300">
          로딩...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
