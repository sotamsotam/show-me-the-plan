function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function OpsDashboardSummary({
  summary,
}: {
  summary: {
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
  };
}) {
  const { members, subscriptions } = summary;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
          회원
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="전체" value={members.total} />
          <StatCard label="학생" value={members.students} />
          <StatCard label="매니저" value={members.managers} />
          <StatCard label="운영자" value={members.operators} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
          구독 상태
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="체험 중" value={subscriptions.byStatus.trialing ?? 0} />
          <StatCard label="이용 중" value={subscriptions.byStatus.active ?? 0} />
          <StatCard label="연체" value={subscriptions.byStatus.past_due ?? 0} />
          <StatCard label="만료" value={subscriptions.byStatus.expired ?? 0} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
          주의 필요
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="해지 예약"
            value={subscriptions.cancelAtPeriodEnd}
            hint="cancelAtPeriodEnd"
          />
          <StatCard
            label="7일 내 만료"
            value={subscriptions.expiringIn7Days}
            hint="trialing / active / past_due"
          />
          <StatCard label="구독 레코드" value={subscriptions.total} />
        </div>
      </section>
    </div>
  );
}
