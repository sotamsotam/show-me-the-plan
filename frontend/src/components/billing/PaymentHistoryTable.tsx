import Link from 'next/link';
import {
  formatKrw,
  formatPaymentStatus,
} from '@/lib/billing/format';

export type PaymentHistoryRow = {
  id: number;
  planPrice: number;
  discountAmount: number;
  pointAmountUsed?: number;
  amount: number;
  status: string;
  paidAt?: string | null;
  receiptUrl?: string | null;
};

interface PaymentHistoryTableProps {
  payments: PaymentHistoryRow[];
  compact?: boolean;
}

export default function PaymentHistoryTable({
  payments,
  compact = false,
}: PaymentHistoryTableProps) {
  if (payments.length === 0) {
    return <p className="text-sm text-gray-500">결제 내역이 없습니다.</p>;
  }

  const rows = compact ? payments.slice(0, 5) : payments;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-gray-200 text-gray-500 dark:border-neutral-700">
          <tr>
            <th className="px-3 py-2 font-medium">결제일</th>
            <th className="px-3 py-2 font-medium">정가</th>
            <th className="px-3 py-2 font-medium">할인</th>
            <th className="px-3 py-2 font-medium">포인트</th>
            <th className="px-3 py-2 font-medium">실결제액</th>
            <th className="px-3 py-2 font-medium">상태</th>
            <th className="px-3 py-2 font-medium">영수증</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
          {rows.map((payment) => (
            <tr key={payment.id}>
              <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                {payment.paidAt
                  ? new Date(payment.paidAt).toLocaleString('ko-KR')
                  : '-'}
              </td>
              <td className="px-3 py-3">{formatKrw(payment.planPrice)}</td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-400">
                {payment.discountAmount - (payment.pointAmountUsed ?? 0) > 0
                  ? `-${formatKrw(payment.discountAmount - (payment.pointAmountUsed ?? 0))}`
                  : '-'}
              </td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-400">
                {(payment.pointAmountUsed ?? 0) > 0
                  ? `-${formatKrw(payment.pointAmountUsed ?? 0)}`
                  : '-'}
              </td>
              <td className="px-3 py-3 font-medium text-gray-900 dark:text-gray-100">
                {formatKrw(payment.amount)}
              </td>
              <td className="px-3 py-3">{formatPaymentStatus(payment.status)}</td>
              <td className="px-3 py-3">
                {payment.receiptUrl ? (
                  <Link
                    href={payment.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    보기
                  </Link>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
