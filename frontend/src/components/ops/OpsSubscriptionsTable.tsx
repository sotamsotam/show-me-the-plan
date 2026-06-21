import Link from 'next/link';

export type OpsSubscriptionRow = {
  userId: number;
  username: string;
  email: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  nextBillingAmount: number | null;
  hasDiscount: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  trialing: '체험',
  active: '이용 중',
  past_due: '연체',
  expired: '만료',
  canceled: '해지',
};

function formatDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatKrw(amount: number | null): string {
  if (amount == null) {
    return '-';
  }

  return `${amount.toLocaleString('ko-KR')}원`;
}

export function OpsSubscriptionsTable({ items }: { items: OpsSubscriptionRow[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
        조건에 맞는 구독이 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead className="bg-slate-900/80 text-left text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">사용자</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium">기간 종료</th>
            <th className="px-4 py-3 font-medium">다음 청구</th>
            <th className="px-4 py-3 font-medium">할인</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-100">
          {items.map((item) => (
            <tr key={item.userId} className="hover:bg-slate-900/50">
              <td className="px-4 py-3">
                <Link
                  href={`/ops/subscriptions/${item.userId}`}
                  className="font-medium text-sky-400 hover:underline"
                >
                  {item.username}
                </Link>
                <div className="text-xs text-slate-400">{item.email}</div>
              </td>
              <td className="px-4 py-3">
                {STATUS_LABEL[item.status] ?? item.status}
                {item.cancelAtPeriodEnd ? (
                  <span className="ml-1 text-xs text-amber-400">해지 예약</span>
                ) : null}
              </td>
              <td className="px-4 py-3">{formatDate(item.currentPeriodEnd)}</td>
              <td className="px-4 py-3">{formatKrw(item.nextBillingAmount)}</td>
              <td className="px-4 py-3">{item.hasDiscount ? '있음' : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
