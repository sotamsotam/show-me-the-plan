'use client';

import SignOutIcon from '@/components/SignOutIcon';
import { signOut } from 'next-auth/react';

type SignOutButtonProps = {
  variant?: 'icon' | 'menu' | 'text';
};

export default function SignOutButton({ variant = 'icon' }: SignOutButtonProps) {
  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/' })}
        className="touch-press w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
      >
        로그아웃
      </button>
    );
  }

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/' })}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-zinc-800"
      >
        <SignOutIcon className="h-4 w-4" />
        로그아웃
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/' })}
      className="touch-press inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-100"
      aria-label="로그아웃"
      title="로그아웃"
    >
      <SignOutIcon />
    </button>
  );
}
