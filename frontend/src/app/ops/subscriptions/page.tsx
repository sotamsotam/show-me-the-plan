import Link from 'next/link';
import { OpsSubscriptionsTable } from '@/components/ops/OpsSubscriptionsTable';
import { fetchOpsInternal } from '@/lib/ops/auth';

const STATUS_FILTERS = [
  { value: '', label: '전체' },
  { value: 'trialing', label: '체험' },
  { value: 'active', label: '이용 중' },
  { value: 'past_due', label: '연체' },
  { value: 'expired', label: '만료' },
  { value: 'canceled', label: '해지' },
] as const;

export default async function OpsSubscriptionsPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    status?: string;
    cancelAtPeriodEnd?: string;
  };
}) {
  const params = new URLSearchParams();
  params.set('page', searchParams.page ?? '1');
  params.set('pageSize', '20');

  if (searchParams.status) {
    params.set('status', searchParams.status);
  }
  if (searchParams.cancelAtPeriodEnd === 'true') {
    params.set('cancelAtPeriodEnd', 'true');
  }

  const result = await fetchOpsInternal<{
    items: Array<{
      userId: number;
      username: string;
      email: string;
      status: string;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
      nextBillingAmount: number | null;
      hasDiscount: boolean;
    }>;
    page: number;
    pageSize: number;
    total: number;
  }>(`/api/ops/internal/subscriptions?${params.toString()}`);

  const totalPages =
    result.ok && result.data.pageSize > 0
      ? Math.max(1, Math.ceil(result.data.total / result.data.pageSize))
      : 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">구독 목록</h2>
        <p className="mt-1 text-sm text-slate-400">학생 구독 상태·청구 요약</p>
      </div>

      <form
        method="get"
        className="flex flex-wrap gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4"
      >
        <select
          name="status"
          defaultValue={searchParams.status ?? ''}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="cancelAtPeriodEnd"
            value="true"
            defaultChecked={searchParams.cancelAtPeriodEnd === 'true'}
            className="rounded border-slate-600"
          />
          해지 예약만
        </label>
        <button
          type="submit"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          필터
        </button>
      </form>

      {!result.ok ? (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-6 text-red-200">
          구독 목록을 불러오지 못했습니다. {result.error}
        </div>
      ) : (
        <>
          <OpsSubscriptionsTable items={result.data.items} />
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              총 {result.data.total}건 · {result.data.page}/{totalPages} 페이지
            </span>
            <div className="flex gap-2">
              {result.data.page > 1 ? (
                <Link
                  href={`/ops/subscriptions?${new URLSearchParams({
                    ...(searchParams.status ? { status: searchParams.status } : {}),
                    ...(searchParams.cancelAtPeriodEnd === 'true'
                      ? { cancelAtPeriodEnd: 'true' }
                      : {}),
                    page: String(result.data.page - 1),
                  }).toString()}`}
                  className="rounded border border-slate-700 px-3 py-1 hover:bg-slate-900"
                >
                  이전
                </Link>
              ) : null}
              {result.data.page < totalPages ? (
                <Link
                  href={`/ops/subscriptions?${new URLSearchParams({
                    ...(searchParams.status ? { status: searchParams.status } : {}),
                    ...(searchParams.cancelAtPeriodEnd === 'true'
                      ? { cancelAtPeriodEnd: 'true' }
                      : {}),
                    page: String(result.data.page + 1),
                  }).toString()}`}
                  className="rounded border border-slate-700 px-3 py-1 hover:bg-slate-900"
                >
                  다음
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
