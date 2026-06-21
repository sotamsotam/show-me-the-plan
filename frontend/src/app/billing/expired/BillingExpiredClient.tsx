'use client';

import Link from 'next/link';

export default function BillingExpiredClient() {
  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-red-600 dark:text-red-400">구독 만료</p>
      <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
        무료 체험 또는 구독 기간이 종료되었습니다
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        Show Me The Plan의 스케줄, 스터디 플랜, TODO 등 모든 기능을 다시 이용하려면
        구독이 필요합니다. 월 4,900원(VAT 포함)으로 언제든 재구독할 수 있습니다.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/billing/checkout"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          구독하고 계속 이용하기
        </Link>
        <Link
          href="/dashboard/settings/billing"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-zinc-800"
        >
          구독 관리
        </Link>
      </div>
      <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
        매니저(학부모·선생님) 계정은 무료입니다. 학생이 재구독하면 연결된 매니저의
        관리 기능도 자동으로 다시 활성화됩니다.
      </p>
    </div>
  );
}
