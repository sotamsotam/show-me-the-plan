import Link from 'next/link';

export default function BillingDisclosure() {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-neutral-700 dark:bg-zinc-900/50 dark:text-gray-300">
      <p className="font-medium text-gray-900 dark:text-gray-100">결제 전 확인사항</p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          신규 가입 학생은 <strong>14일 무료 체험</strong> 후, 구독 시{' '}
          <strong>월 4,900원(VAT 포함)</strong>이 결제됩니다.
        </li>
        <li>
          카드 등록 완료 후 <strong>매월 자동 갱신</strong>됩니다. 해지는{' '}
          <strong>설정 → 구독 · 결제</strong>에서 &quot;해지 예약&quot;으로 가능하며,{' '}
          <strong>이용 기간 종료 전</strong>까지 &quot;해지 예약 취소&quot;로 철회할 수
          있습니다.
        </li>
        <li>
          체험 종료 후 구독하지 않으면 대시보드 이용이 제한됩니다. 구독·결제 관련
          화면은 계속 이용할 수 있습니다.
        </li>
        <li>
          만 14세 미만 학생은 법정대리인 동의가 필요합니다. 가입 시 확인한 동의
          정보가 없으면 결제할 수 없습니다.
        </li>
      </ul>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        자세한 내용은{' '}
        <Link href="/legal/paid-service" className="text-blue-600 hover:underline">
          유료서비스 이용약관
        </Link>
        을 확인해 주세요.
      </p>
    </div>
  );
}
