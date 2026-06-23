import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpsDiscountEditor from '@/components/ops/OpsDiscountEditor';
import OpsPointsEditor from '@/components/ops/OpsPointsEditor';
import { fetchOpsInternal } from '@/lib/ops/auth';
import { SCHOOL_LEVEL_LABEL } from '@/types/school';

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatKrw(amount: number | null | undefined): string {
  if (amount == null) {
    return '-';
  }

  return `${amount.toLocaleString('ko-KR')}원`;
}

export default async function OpsSubscriptionDetailPage({
  params,
}: {
  params: { userId: string };
}) {
  const userId = Number(params.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    notFound();
  }

  const result = await fetchOpsInternal<{
    user: { id: number; username: string; email: string };
    profile: {
      schoolLevel: string | null;
      managerStatus: string | null;
      schoolName: string | null;
      grade: string | null;
    };
    subscription: {
      status: string;
      isAccessAllowed: boolean;
      currentPeriodStart: string | null;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
      hasBillingKey: boolean;
      plan: { name: string; price: number } | null;
      nextBilling: {
        billedAmount: number;
        planPrice: number;
        discountAmount: number;
        pointAmountUsed: number;
      } | null;
      pointBalance: number;
      usePointsOnNextBilling: boolean;
    } | null;
    discount: {
      discountPercent: number | null;
      discountFixedAmount: number | null;
      overridePrice: number | null;
      discountStartsAt: string | null;
      discountEndsAt: string | null;
      discountApplyOnce?: boolean;
      discountNote: string | null;
      discountGrantedAt: string | null;
      discountGrantedBy: string | null;
    } | null;
    points: {
      pointBalance: number;
      usePointsOnNextBilling: boolean;
    } | null;
    paymentHistory: Array<{
      id: number;
      amount: number | null;
      status: string | null;
      paidAt: string | null;
    }>;
    managerCount: number;
  }>(`/api/ops/internal/subscriptions/${userId}`);

  if (!result.ok) {
    if (result.status === 404) {
      notFound();
    }

    return (
      <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-6 text-red-200">
        구독 상세를 불러오지 못했습니다. {result.error}
      </div>
    );
  }

  const { user, profile, subscription, discount, points, paymentHistory, managerCount } =
    result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/ops/subscriptions" className="text-sm text-sky-400 hover:underline">
            ← 구독 목록
          </Link>
          <h2 className="mt-2 text-xl font-semibold text-white">{user.username}</h2>
          <p className="text-sm text-slate-400">
            {user.email} · ID {user.id}
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="text-sm font-medium text-slate-300">프로필</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">학교급</dt>
            <dd>
              {profile.schoolLevel
                ? (SCHOOL_LEVEL_LABEL[profile.schoolLevel] ?? profile.schoolLevel)
                : '-'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">학교</dt>
            <dd>{profile.schoolName ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">학년</dt>
            <dd>{profile.grade ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">연결 매니저</dt>
            <dd>{managerCount}명</dd>
          </div>
        </dl>
      </section>

      {subscription ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="text-sm font-medium text-slate-300">구독</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">상태</dt>
              <dd>{subscription.status}</dd>
            </div>
            <div>
              <dt className="text-slate-500">접근</dt>
              <dd>{subscription.isAccessAllowed ? '허용' : '차단'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">기간</dt>
              <dd>
                {formatDate(subscription.currentPeriodStart)} ~{' '}
                {formatDate(subscription.currentPeriodEnd)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">해지 예약</dt>
              <dd>{subscription.cancelAtPeriodEnd ? '예' : '아니오'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">빌링키</dt>
              <dd>{subscription.hasBillingKey ? '등록됨' : '없음'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">다음 청구</dt>
              <dd>
                {formatKrw(subscription.nextBilling?.billedAmount)}
                {subscription.nextBilling?.discountAmount
                  ? ` (총 할인 ${formatKrw(subscription.nextBilling.discountAmount)}`
                  : null}
                {subscription.nextBilling?.pointAmountUsed
                  ? `, 포인트 ${formatKrw(subscription.nextBilling.pointAmountUsed)}`
                  : null}
                {subscription.nextBilling?.discountAmount ? ')' : null}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">보유 포인트</dt>
              <dd>
                {subscription.pointBalance.toLocaleString('ko-KR')}P
                {subscription.usePointsOnNextBilling ? ' · 다음 청구 적용 예약' : ''}
              </dd>
            </div>
          </dl>
        </section>
      ) : (
        <p className="text-sm text-slate-400">구독 정보 없음 (매니저 또는 비학생)</p>
      )}

      {discount ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="text-sm font-medium text-slate-300">할인 설정 (현재)</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">퍼센트</dt>
              <dd>{discount.discountPercent ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">고정 할인</dt>
              <dd>{formatKrw(discount.discountFixedAmount)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">오버라이드 가격</dt>
              <dd>{formatKrw(discount.overridePrice)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">메모</dt>
              <dd>{discount.discountNote ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">부여 시각</dt>
              <dd>{formatDate(discount.discountGrantedAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">부여자</dt>
              <dd>{discount.discountGrantedBy ?? '-'}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {subscription ? <OpsDiscountEditor userId={userId} initial={discount} /> : null}

      {points ? (
        <OpsPointsEditor
          userId={userId}
          initialPointBalance={points.pointBalance}
          usePointsOnNextBilling={points.usePointsOnNextBilling}
        />
      ) : null}

      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="text-sm font-medium text-slate-300">결제 내역</h3>
        {paymentHistory.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">결제 내역이 없습니다.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-800 text-sm">
            {paymentHistory.map((row) => (
              <li key={row.id} className="flex justify-between py-2">
                <span>
                  {formatDate(row.paidAt)} · {row.status ?? '-'}
                </span>
                <span>{formatKrw(row.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
