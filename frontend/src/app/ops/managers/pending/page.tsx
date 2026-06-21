import { OpsManagerActions } from '@/components/ops/OpsManagerActions';
import { fetchOpsInternal } from '@/lib/ops/auth';

function formatDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function OpsPendingManagersPage() {
  const result = await fetchOpsInternal<{
    items: Array<{
      userId: number;
      username: string;
      email: string;
      createdAt: string | null;
    }>;
  }>('/api/ops/internal/managers/pending');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">매니저 승인 대기</h2>
        <p className="mt-1 text-sm text-slate-400">managerStatus = pending</p>
      </div>

      {!result.ok ? (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-6 text-red-200">
          목록을 불러오지 못했습니다. {result.error}
        </div>
      ) : result.data.items.length === 0 ? (
        <p className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          승인 대기 중인 매니저가 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/40">
          {result.data.items.map((item) => (
            <li
              key={item.userId}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-white">{item.username}</p>
                <p className="text-sm text-slate-400">{item.email}</p>
                <p className="mt-1 text-xs text-slate-500">
                  가입 {formatDate(item.createdAt)} · ID {item.userId}
                </p>
              </div>
              <OpsManagerActions userId={item.userId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
