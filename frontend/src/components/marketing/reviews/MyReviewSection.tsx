'use client';

import { useState } from 'react';
import {
  REVIEW_CONTENT_MAX_LENGTH,
  type UserReview,
} from '@/lib/user-review';
import { StarRatingInput } from './StarRating';
import ReviewCard from './ReviewCard';

type MyReviewSectionProps = {
  reviews: UserReview[];
  onUpdated: () => Promise<void> | void;
};

export default function MyReviewSection({ reviews, onUpdated }: MyReviewSectionProps) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-mkt-text-subtle">아직 작성한 사용후기가 없습니다.</p>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <MyReviewCard key={review.id} review={review} onUpdated={onUpdated} />
      ))}
    </div>
  );
}

function MyReviewCard({
  review,
  onUpdated,
}: {
  review: UserReview;
  onUpdated: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(review.content);
  const [rating, setRating] = useState(review.rating);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/user-reviews/${review.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), rating }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '수정에 실패했습니다.');
        return;
      }

      setEditing(false);
      await onUpdated();
    } catch {
      setError('수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      '이 사용후기를 삭제할까요? 운영자 답글이 있어도 함께 삭제됩니다.'
    );

    if (!confirmed) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/user-reviews/${review.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '삭제에 실패했습니다.');
        return;
      }

      await onUpdated();
    } catch {
      setError('삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ReviewCard review={review} showStatus>
      {editing ? (
        <form onSubmit={handleUpdate} className="space-y-3">
          <StarRatingInput value={rating} onChange={setRating} disabled={loading} />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={REVIEW_CONTENT_MAX_LENGTH}
            rows={4}
            disabled={loading}
            className="w-full rounded-xl border border-mkt-border bg-white px-3 py-2 text-sm outline-none ring-mkt-accent/30 focus:ring-2"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-mkt-accent px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              저장
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setEditing(false);
                setContent(review.content);
                setRating(review.rating);
              }}
              className="rounded-full border border-mkt-border px-4 py-1.5 text-xs font-semibold text-mkt-text-muted"
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => setEditing(true)}
            className="rounded-full border border-mkt-border px-4 py-1.5 text-xs font-semibold text-mkt-text-muted hover:bg-mkt-surface-alt disabled:opacity-60"
          >
            수정
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            삭제
          </button>
        </div>
      )}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </ReviewCard>
  );
}
