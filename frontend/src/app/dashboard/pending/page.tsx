import SignOutButton from '../SignOutButton';

export default function PendingManagerPage() {
  return (
    <main className="flex w-full flex-col items-center justify-center py-12">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-2xl font-semibold">매니저 승인 대기</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          매니저 가입이 접수되었습니다. 관리자 승인 후 매니저 기능을 이용할 수
          있습니다.
        </p>

        <div className="mb-6 space-y-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-medium">현재 상태: 승인 대기 중</p>
          <p>승인이 완료되면 다시 로그인하거나 페이지를 새로고침해 주세요.</p>
        </div>

        <SignOutButton />
      </div>
    </main>
  );
}
