'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  REVIEW_CONTENT_MAX_LENGTH,
  type UserReviewInput,
} from '@/lib/user-review';
import { StarRatingInput } from './StarRating';

type ReviewWriteFormProps = {
  canWrite: boolean;
  isLoggedIn: boolean;
  isReviewAuthor: boolean;
  onCreated: () => Promise<void> | void;
};

export default function ReviewWriteForm({
  canWrite,
  isLoggedIn,
  isReviewAuthor,
  onCreated,
}: ReviewWriteFormProps) {
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isLoggedIn) {
    return (
      <div className="mkt-card-elevated rounded-2xl p-6 text-center">
        <p className="text-sm text-mkt-text-muted">
          사용후기는 로그인한 회원만 작성할 수 있습니다.
        </p>
        <Link
          href="/login?callbackUrl=/reviews"
          className="mt-4 inline-flex rounded-full bg-mkt-accent px-6 py-2.5 text-sm font-bold text-white hover:bg-mkt-accent-hover"
        >
          로그인하고 작성하기
        </Link>
      </div>
    );
  }

  if (!isReviewAuthor) {
    return (
      <div className="mkt-card-elevated rounded-2xl p-6">
        <p className="text-sm text-mkt-text-muted">
          사용후기는 학생 또는 승인된 매니저 회원만 작성할 수 있습니다.
        </p>
      </div>
    );
  }

  if (!canWrite) {
    return (
      <div className="mkt-card-elevated rounded-2xl p-6">
        <p className="text-sm text-mkt-text-muted">
          구독이 만료되어 사용후기를 작성할 수 없습니다. 구독을 갱신한 뒤 다시
          시도해 주세요.
        </p>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const trimmed = content.trim();

    if (!trimmed) {
      setError('후기 내용을 입력해 주세요.');
      return;
    }

    setLoading(true);

    try {
      const body: UserReviewInput = { content: trimmed, rating };
      const res = await fetch('/api/user-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '사용후기 작성에 실패했습니다.');
        return;
      }

      setContent('');
      setRating(5);
      setSuccess('사용후기가 등록되었습니다. 운영자 승인 후 공개됩니다.');
      await onCreated();
    } catch {
      setError('사용후기 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mkt-card-elevated rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-mkt-text">사용후기 작성</h2>
      <p className="mt-1 text-sm text-mkt-text-subtle">
        작성하신 후기는 운영자 승인 후 공개됩니다.
      </p>

      <div className="mt-4 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-mkt-text">별점</span>
          <StarRatingInput value={rating} onChange={setRating} disabled={loading} />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-mkt-text">후기 내용</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={REVIEW_CONTENT_MAX_LENGTH}
            rows={5}
            disabled={loading}
            placeholder="서비스를 사용하며 느낀 점을 자유롭게 남겨 주세요."
            className="w-full rounded-xl border border-mkt-border bg-white px-4 py-3 text-sm text-mkt-text outline-none ring-mkt-accent/30 focus:ring-2 disabled:opacity-60"
          />
          <span className="block text-right text-xs text-mkt-text-subtle">
            {content.length}/{REVIEW_CONTENT_MAX_LENGTH}
          </span>
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-emerald-700">{success}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-full bg-mkt-accent px-6 py-2.5 text-sm font-bold text-white hover:bg-mkt-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? '등록 중...' : '사용후기 등록'}
      </button>
    </form>
  );
}
