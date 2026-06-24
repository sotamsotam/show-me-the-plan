import { MarketingSection } from '@/components/marketing/MarketingSection';
import { StarRatingDisplay } from '@/components/marketing/reviews/StarRating';
import { formatReviewDate, type HomeFeaturedReview } from '@/lib/user-review';
import Link from 'next/link';

type HomeFeaturedReviewsSectionProps = {
  reviews: HomeFeaturedReview[];
};

function HomeFeaturedReviewCard({
  review,
  variant,
}: {
  review: HomeFeaturedReview;
  variant: 'accent' | 'primary';
}) {
  const cardClass =
    variant === 'accent' ? 'mkt-card-accent' : 'mkt-card-primary';

  return (
    <article className={`${cardClass} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-mkt-text">{review.authorName}</p>
          <p className="mt-1 text-xs text-mkt-text-subtle">
            {formatReviewDate(review.createdAt)}
          </p>
        </div>
        <StarRatingDisplay value={review.rating} />
      </div>
      <p className="mkt-body mt-4 whitespace-pre-wrap text-sm sm:leading-7">
        {review.content}
      </p>
    </article>
  );
}

export default function HomeFeaturedReviewsSection({
  reviews,
}: HomeFeaturedReviewsSectionProps) {
  if (reviews.length === 0) {
    return null;
  }

  return (
    <MarketingSection
      eyebrow="사용후기"
      title="실제 사용자들의 이야기"
      description="회원이 남긴 후기 중 운영자가 선정한 내용입니다."
      variant="default"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        {reviews.map((review, index) => (
          <HomeFeaturedReviewCard
            key={review.id}
            review={review}
            variant={index % 2 === 0 ? 'accent' : 'primary'}
          />
        ))}

        <p className="pt-2 text-center">
          <Link
            href="/reviews"
            className="text-sm font-semibold text-mkt-accent hover:underline"
          >
            사용후기 더 보기 →
          </Link>
        </p>
      </div>
    </MarketingSection>
  );
}
