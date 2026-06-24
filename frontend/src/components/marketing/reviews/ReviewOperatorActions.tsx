'use client';

import { useState } from 'react';
import {
  REVIEW_CONTENT_MAX_LENGTH,
  REVIEW_REPLY_MAX_LENGTH,
  type UserReview,
} from '@/lib/user-review';
import { StarRatingInput } from './StarRating';
import ReviewCard from './ReviewCard';

type ReviewOperatorActionsProps = {
  review: UserReview;
  onUpdated: () => Promise<void> | void;
};

export default function ReviewOperatorActions({
  review,
  onUpdated,
}: ReviewOperatorActionsProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState(review.reply ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function runAction(
    action: () => Promise<Response>,
    fallbackError: string
  ) {
    setError('');
    setLoading(true);

    try {
      const res = await action();
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? fallbackError);
        return;
      }

      await onUpdated();
    } catch {
      setError(fallbackError);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    await runAction(
      () =>
        fetch(`/api/user-reviews/${review.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'published' }),
        }),
      '승인 처리에 실패했습니다.'
    );
  }

  async function handleHide() {
    await runAction(
      () =>
        fetch(`/api/user-reviews/${review.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'hidden' }),
        }),
      '숨김 처리에 실패했습니다.'
    );
  }

  async function handleReplySubmit(event: React.FormEvent) {
    event.preventDefault();

    await runAction(
      () =>
        fetch(`/api/user-reviews/${review.id}/reply`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reply: reply.trim() }),
        }),
      '답글 저장에 실패했습니다.'
    );

    setReplyOpen(false);
  }

  async function handleToggleHomeFeatured() {
    await runAction(
      () =>
        fetch(`/api/user-reviews/${review.id}/home-featured`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featuredOnHome: !review.featuredOnHome }),
        }),
      '홈 노출 설정 변경에 실패했습니다.'
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {review.status !== 'published' ? (
          <button
            type="button"
            disabled={loading}
            onClick={handleApprove}
            className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            승인
          </button>
        ) : null}
        {review.status === 'published' ? (
          <button
            type="button"
            disabled={loading}
            onClick={handleHide}
            className="rounded-full border border-mkt-border px-4 py-1.5 text-xs font-semibold text-mkt-text-muted hover:bg-mkt-surface-alt disabled:opacity-60"
          >
            숨김
          </button>
        ) : null}
        {review.status === 'published' ? (
          <button
            type="button"
            disabled={loading}
            onClick={handleToggleHomeFeatured}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-60 ${
              review.featuredOnHome
                ? 'bg-mkt-accent text-white hover:opacity-90'
                : 'border border-mkt-accent/40 text-mkt-accent hover:bg-mkt-surface-alt'
            }`}
          >
            {review.featuredOnHome ? '홈 노출 해제' : '홈 노출'}
          </button>
        ) : null}
        <button
          type="button"
          disabled={loading}
          onClick={() => setReplyOpen((open) => !open)}
          className="rounded-full border border-mkt-primary/30 px-4 py-1.5 text-xs font-semibold text-mkt-primary hover:bg-mkt-surface-alt disabled:opacity-60"
        >
          {review.reply ? '답글 수정' : '답글 달기'}
        </button>
      </div>

      {replyOpen ? (
        <form onSubmit={handleReplySubmit} className="space-y-2">
          <textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            maxLength={REVIEW_REPLY_MAX_LENGTH}
            rows={3}
            disabled={loading}
            placeholder="운영자 답글을 입력해 주세요."
            className="w-full rounded-xl border border-mkt-border bg-white px-3 py-2 text-sm outline-none ring-mkt-accent/30 focus:ring-2"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-mkt-primary px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? '저장 중...' : '답글 저장'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setReplyOpen(false)}
              className="rounded-full border border-mkt-border px-4 py-1.5 text-xs font-semibold text-mkt-text-muted"
            >
              취소
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

type ReviewOperatorSectionProps = {
  reviews: UserReview[];
  onUpdated: () => Promise<void> | void;
};

export function ReviewOperatorSection({
  reviews,
  onUpdated,
}: ReviewOperatorSectionProps) {
  const actionable = reviews.filter(
    (review) => review.status === 'pending' || review.status === 'hidden'
  );

  if (actionable.length === 0) {
    return (
      <p className="text-sm text-mkt-text-subtle">
        승인 대기 또는 숨김 상태의 후기가 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {actionable.map((review) => (
        <ReviewCard key={review.id} review={review} showStatus>
          <ReviewOperatorActions review={review} onUpdated={onUpdated} />
        </ReviewCard>
      ))}
    </div>
  );
}
