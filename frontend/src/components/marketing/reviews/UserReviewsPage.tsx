'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UserReview, UserReviewLoadErrors } from '@/lib/user-review';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import ReviewCard from './ReviewCard';
import ReviewWriteForm from './ReviewWriteForm';
import MyReviewSection from './MyReviewSection';
import ReviewOperatorActions, {
  ReviewOperatorSection,
} from './ReviewOperatorActions';

type UserReviewsPageProps = {
  initialPublishedReviews: UserReview[];
  initialMineReviews: UserReview[];
  initialOperatorReviews: UserReview[];
  initialLoadErrors?: UserReviewLoadErrors;
  isLoggedIn: boolean;
  isOperator: boolean;
  canWrite: boolean;
  showMineSection: boolean;
  isReviewAuthor: boolean;
};

async function fetchReviews(url: string): Promise<{
  reviews: UserReview[] | null;
  error: string | null;
}> {
  try {
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const message =
        data && typeof data === 'object' && 'error' in data
          ? String((data as { error?: unknown }).error ?? '')
          : '';

      return {
        reviews: null,
        error: message || '사용후기를 불러오지 못했습니다.',
      };
    }

    const data = (await res.json()) as { reviews?: UserReview[] };
    return { reviews: data.reviews ?? [], error: null };
  } catch {
    return { reviews: null, error: '사용후기를 불러오지 못했습니다.' };
  }
}

function LoadErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </div>
  );
}

export default function UserReviewsPage({
  initialPublishedReviews,
  initialMineReviews,
  initialOperatorReviews,
  initialLoadErrors = {},
  isLoggedIn,
  isOperator,
  canWrite,
  showMineSection,
  isReviewAuthor,
}: UserReviewsPageProps) {
  const [publishedReviews, setPublishedReviews] = useState(initialPublishedReviews);
  const [mineReviews, setMineReviews] = useState(initialMineReviews);
  const [operatorReviews, setOperatorReviews] = useState(initialOperatorReviews);
  const [loadErrors, setLoadErrors] = useState(initialLoadErrors);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;

    if (hash === '#write' || hash === '#mine') {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);

    try {
      const nextErrors: UserReviewLoadErrors = {};

      const [publishedResult, mineResult, opsResult] = await Promise.all([
        fetchReviews('/api/user-reviews'),
        isLoggedIn && showMineSection
          ? fetchReviews('/api/user-reviews/mine')
          : Promise.resolve({ reviews: null, error: null }),
        isOperator
          ? fetchReviews('/api/user-reviews/ops')
          : Promise.resolve({ reviews: null, error: null }),
      ]);

      if (publishedResult.error) {
        nextErrors.published = publishedResult.error;
      } else if (publishedResult.reviews) {
        setPublishedReviews(publishedResult.reviews);
      }

      if (mineResult.error) {
        nextErrors.mine = mineResult.error;
      } else if (mineResult.reviews) {
        setMineReviews(mineResult.reviews);
      }

      if (opsResult.error) {
        nextErrors.operator = opsResult.error;
      } else if (opsResult.reviews) {
        setOperatorReviews(opsResult.reviews);
      }

      setLoadErrors(nextErrors);
    } finally {
      setRefreshing(false);
    }
  }, [isLoggedIn, isOperator, showMineSection]);

  useEffect(() => {
    if (!isOperator) {
      return;
    }

    void refreshAll();
  }, [isOperator, refreshAll]);

  async function handleCreated() {
    await refreshAll();
    document.getElementById('mine')?.scrollIntoView({ behavior: 'smooth' });
  }

  function resolveOperatorReview(review: UserReview): UserReview {
    if (!isOperator) {
      return review;
    }

    return operatorReviews.find((item) => item.id === review.id) ?? review;
  }

  return (
    <>
      <section className="mkt-hero-bg px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mkt-eyebrow mb-2">사용후기</p>
          <h1 className="mkt-h1">쇼미더플랜을 사용한 분들의 이야기</h1>
          <p className="mkt-lead mt-4">
            실제 사용자들의 후기를 확인하고, 회원이라면 여러분의 경험도 남겨
            주세요.
          </p>
        </div>
      </section>

      {isOperator ? (
        <MarketingSection
          id="operator"
          title="운영자 관리"
          eyebrow="승인 · 답글"
          description="승인 대기 또는 숨김 상태의 후기를 검토하고 답글을 작성할 수 있습니다."
          variant="accent-tint"
        >
          {loadErrors.operator ? (
            <LoadErrorBanner message={loadErrors.operator} />
          ) : null}
          <div className={loadErrors.operator ? 'mt-4' : ''}>
            <ReviewOperatorSection reviews={operatorReviews} onUpdated={refreshAll} />
          </div>
        </MarketingSection>
      ) : null}

      <MarketingSection
        title="공개된 사용후기"
        eyebrow="후기"
        description={refreshing ? '목록을 새로고침하는 중입니다.' : undefined}
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {loadErrors.published ? <LoadErrorBanner message={loadErrors.published} /> : null}

          <div
            aria-busy={refreshing}
            className={`space-y-4 transition-opacity ${refreshing ? 'opacity-60' : ''}`}
          >
            {!loadErrors.published && publishedReviews.length === 0 ? (
              <p className="text-sm text-mkt-text-subtle">
                아직 등록된 사용후기가 없습니다.
              </p>
            ) : null}

            {publishedReviews.map((review) => {
              const displayReview = resolveOperatorReview(review);

              return (
                <ReviewCard key={review.id} review={displayReview}>
                  {isOperator ? (
                    <ReviewOperatorActions
                      review={displayReview}
                      onUpdated={refreshAll}
                    />
                  ) : null}
                </ReviewCard>
              );
            })}
          </div>
        </div>
      </MarketingSection>

      <MarketingSection
        id="write"
        title={showMineSection ? '후기 작성' : '후기 작성 안내'}
        variant="alt"
      >
        <div className="mx-auto max-w-3xl space-y-8">
          <ReviewWriteForm
            canWrite={canWrite}
            isLoggedIn={isLoggedIn}
            isReviewAuthor={isReviewAuthor}
            onCreated={handleCreated}
          />

          {showMineSection ? (
            <div id="mine">
              <h2 className="mb-4 text-lg font-semibold text-mkt-text">
                내가 작성한 후기
              </h2>
              {loadErrors.mine ? <LoadErrorBanner message={loadErrors.mine} /> : null}
              <div className={loadErrors.mine ? 'mt-4' : ''}>
                <MyReviewSection reviews={mineReviews} onUpdated={refreshAll} />
              </div>
            </div>
          ) : null}
        </div>
      </MarketingSection>
    </>
  );
}
