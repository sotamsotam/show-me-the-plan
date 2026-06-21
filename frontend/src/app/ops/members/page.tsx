import Link from 'next/link';
import { OpsMembersTable } from '@/components/ops/OpsMembersTable';
import { fetchOpsInternal } from '@/lib/ops/auth';
import { SCHOOL_LEVEL_OPTIONS } from '@/types/school';

const SUBSCRIPTION_FILTERS = [
  { value: '', label: '전체' },
  { value: 'trialing', label: '체험' },
  { value: 'active', label: '이용 중' },
  { value: 'past_due', label: '연체' },
  { value: 'expired', label: '만료' },
  { value: 'canceled', label: '해지' },
] as const;

export default async function OpsMembersPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    schoolLevel?: string;
    subscriptionStatus?: string;
    q?: string;
  };
}) {
  const page = searchParams.page ?? '1';
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('pageSize', '20');

  if (searchParams.schoolLevel) {
    params.set('schoolLevel', searchParams.schoolLevel);
  }
  if (searchParams.subscriptionStatus) {
    params.set('subscriptionStatus', searchParams.subscriptionStatus);
  }
  if (searchParams.q) {
    params.set('q', searchParams.q);
  }

  const result = await fetchOpsInternal<{
    items: Array<{
      userId: number;
      username: string;
      email: string;
      schoolLevel: string | null;
      managerStatus: string | null;
      subscriptionStatus: string | null;
      isAccessAllowed: boolean | null;
    }>;
    page: number;
    pageSize: number;
    total: number;
  }>(`/api/ops/internal/members?${params.toString()}`);

  const totalPages =
    result.ok && result.data.pageSize > 0
      ? Math.max(1, Math.ceil(result.data.total / result.data.pageSize))
      : 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">회원 목록</h2>
        <p className="mt-1 text-sm text-slate-400">학생·매니저 계정 (운영자 제외)</p>
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-4"
      >
        <input
          name="q"
          defaultValue={searchParams.q ?? ''}
          placeholder="이메일·사용자명 검색"
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <select
          name="schoolLevel"
          defaultValue={searchParams.schoolLevel ?? ''}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">학교급 전체</option>
          {SCHOOL_LEVEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          name="subscriptionStatus"
          defaultValue={searchParams.subscriptionStatus ?? ''}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          {SUBSCRIPTION_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              구독: {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          검색
        </button>
      </form>

      {!result.ok ? (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-6 text-red-200">
          회원 목록을 불러오지 못했습니다. {result.error}
        </div>
      ) : (
        <>
          <OpsMembersTable items={result.data.items} />
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              총 {result.data.total}명 · {result.data.page}/{totalPages} 페이지
            </span>
            <div className="flex gap-2">
              {result.data.page > 1 ? (
                <Link
                  href={`/ops/members?${new URLSearchParams({
                    ...(searchParams.q ? { q: searchParams.q } : {}),
                    ...(searchParams.schoolLevel
                      ? { schoolLevel: searchParams.schoolLevel }
                      : {}),
                    ...(searchParams.subscriptionStatus
                      ? { subscriptionStatus: searchParams.subscriptionStatus }
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
                  href={`/ops/members?${new URLSearchParams({
                    ...(searchParams.q ? { q: searchParams.q } : {}),
                    ...(searchParams.schoolLevel
                      ? { schoolLevel: searchParams.schoolLevel }
                      : {}),
                    ...(searchParams.subscriptionStatus
                      ? { subscriptionStatus: searchParams.subscriptionStatus }
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
