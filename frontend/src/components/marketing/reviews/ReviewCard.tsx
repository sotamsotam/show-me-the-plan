import {
  USER_REVIEW_STATUS_LABELS,
  formatReviewDate,
  type UserReview,
} from '@/lib/user-review';
import { StarRatingDisplay } from './StarRating';

type ReviewStatusBadgeProps = {
  status: UserReview['status'];
};

function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  const label = USER_REVIEW_STATUS_LABELS[status];
  const className =
    status === 'published'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'pending'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-gray-100 text-gray-600';

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

type ReviewCardProps = {
  review: UserReview;
  showStatus?: boolean;
  children?: React.ReactNode;
};

export default function ReviewCard({
  review,
  showStatus = false,
  children,
}: ReviewCardProps) {
  return (
    <article className="mkt-card-elevated rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-mkt-text">{review.authorName}</p>
            {showStatus ? <ReviewStatusBadge status={review.status} /> : null}
            {showStatus && review.featuredOnHome ? (
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                홈 노출
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-mkt-text-subtle">
            {formatReviewDate(review.createdAt)}
          </p>
        </div>
        <StarRatingDisplay value={review.rating} />
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-mkt-text-muted">
        {review.content}
      </p>

      {review.reply ? (
        <div className="mt-4 rounded-xl border border-mkt-border bg-mkt-surface-alt px-4 py-3">
          <p className="text-xs font-semibold text-mkt-primary">운영자 답글</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-mkt-text-muted">
            {review.reply}
          </p>
          {review.repliedAt ? (
            <p className="mt-2 text-xs text-mkt-text-subtle">
              {formatReviewDate(review.repliedAt)}
            </p>
          ) : null}
        </div>
      ) : null}

      {children ? <div className="mt-4 border-t border-mkt-border pt-4">{children}</div> : null}
    </article>
  );
}
