import UserReviewsPage from '@/components/marketing/reviews/UserReviewsPage';
import { authOptions } from '@/lib/auth';
import {
  canWriteUserReview,
  isReviewAuthorMember,
  type UserReviewLoadErrors,
} from '@/lib/user-review';
import { loadUserReviewsFromAppApi } from '@/lib/user-review-server';
import { strapiFetch } from '@/lib/strapi';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';

export const metadata: Metadata = {
  title: '사용후기',
  description:
    '쇼미더플랜 실제 사용자들의 후기를 확인하고, 회원이라면 사용 경험을 남겨 보세요.',
};

async function loadPublishedReviews() {
  try {
    const res = await strapiFetch('/api/user-reviews', { cache: 'no-store' });

    if (!res.ok) {
      return {
        reviews: [],
        error: '공개된 사용후기를 불러오지 못했습니다.',
      };
    }

    const data = await res.json();
    return { reviews: data.reviews ?? [], error: null };
  } catch {
    return {
      reviews: [],
      error: '공개된 사용후기를 불러오지 못했습니다.',
    };
  }
}

export default async function ReviewsPage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = Boolean(session?.user);
  const isOperator = session?.user?.isOperator === true;
  const isReviewAuthor = isReviewAuthorMember(session?.user);
  const canWrite = canWriteUserReview(session?.user);
  const showMineSection = isLoggedIn && isReviewAuthor && !isOperator;

  const [publishedResult, mineResult, operatorResult] = await Promise.all([
    loadPublishedReviews(),
    showMineSection
      ? loadUserReviewsFromAppApi(
          '/api/user-reviews/mine',
          '내 사용후기를 불러오지 못했습니다.'
        )
      : Promise.resolve(null),
    isOperator
      ? loadUserReviewsFromAppApi(
          '/api/user-reviews/ops',
          '운영자용 사용후기를 불러오지 못했습니다.'
        )
      : Promise.resolve(null),
  ]);

  const initialLoadErrors: UserReviewLoadErrors = {};

  if (publishedResult.error) {
    initialLoadErrors.published = publishedResult.error;
  }

  if (mineResult?.error) {
    initialLoadErrors.mine = mineResult.error;
  }

  if (operatorResult?.error) {
    initialLoadErrors.operator = operatorResult.error;
  }

  return (
    <UserReviewsPage
      initialPublishedReviews={publishedResult.reviews}
      initialMineReviews={mineResult?.reviews ?? []}
      initialOperatorReviews={operatorResult?.reviews ?? []}
      initialLoadErrors={initialLoadErrors}
      isLoggedIn={isLoggedIn}
      isOperator={isOperator}
      canWrite={canWrite}
      showMineSection={showMineSection}
      isReviewAuthor={isReviewAuthor}
    />
  );
}
