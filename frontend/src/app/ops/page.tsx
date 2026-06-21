import { OpsDashboardSummary } from '@/components/ops/OpsDashboardSummary';
import { fetchOpsInternal } from '@/lib/ops/auth';

export default async function OpsDashboardPage() {
  const result = await fetchOpsInternal<{
    members: {
      students: number;
      managers: number;
      operators: number;
      total: number;
    };
    subscriptions: {
      byStatus: Record<string, number>;
      cancelAtPeriodEnd: number;
      expiringIn7Days: number;
      total: number;
    };
  }>('/api/ops/internal/dashboard/summary');

  if (!result.ok) {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-6 text-red-200">
        대시보드를 불러오지 못했습니다. {result.error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">운영 대시보드</h2>
        <p className="mt-1 text-sm text-slate-400">회원·구독 현황 요약</p>
      </div>
      <OpsDashboardSummary summary={result.data} />
    </div>
  );
}
