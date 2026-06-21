import Link from 'next/link';
import { SCHOOL_LEVEL_LABEL } from '@/types/school';

export type OpsMemberRow = {
  userId: number;
  username: string;
  email: string;
  schoolLevel: string | null;
  managerStatus: string | null;
  subscriptionStatus: string | null;
  isAccessAllowed: boolean | null;
};

const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  trialing: '체험',
  active: '이용 중',
  past_due: '연체',
  expired: '만료',
  canceled: '해지',
};

export function OpsMembersTable({ items }: { items: OpsMemberRow[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
        조건에 맞는 회원이 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead className="bg-slate-900/80 text-left text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">ID</th>
            <th className="px-4 py-3 font-medium">사용자</th>
            <th className="px-4 py-3 font-medium">학교급</th>
            <th className="px-4 py-3 font-medium">구독</th>
            <th className="px-4 py-3 font-medium">접근</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-100">
          {items.map((item) => (
            <tr key={item.userId} className="hover:bg-slate-900/50">
              <td className="px-4 py-3">{item.userId}</td>
              <td className="px-4 py-3">
                <div className="font-medium">{item.username}</div>
                <div className="text-xs text-slate-400">{item.email}</div>
              </td>
              <td className="px-4 py-3">
                {item.schoolLevel
                  ? (SCHOOL_LEVEL_LABEL[item.schoolLevel] ?? item.schoolLevel)
                  : '-'}
                {item.managerStatus ? (
                  <span className="ml-1 text-xs text-slate-500">({item.managerStatus})</span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                {item.subscriptionStatus ? (
                  <Link
                    href={`/ops/subscriptions/${item.userId}`}
                    className="text-sky-400 hover:underline"
                  >
                    {SUBSCRIPTION_STATUS_LABEL[item.subscriptionStatus] ??
                      item.subscriptionStatus}
                  </Link>
                ) : (
                  '-'
                )}
              </td>
              <td className="px-4 py-3">
                {item.isAccessAllowed == null
                  ? '-'
                  : item.isAccessAllowed
                    ? '허용'
                    : '차단'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
