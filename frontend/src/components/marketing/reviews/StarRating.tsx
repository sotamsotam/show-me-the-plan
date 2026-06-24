'use client';

import { REVIEW_RATING_MAX, REVIEW_RATING_MIN } from '@/lib/user-review';

type StarRatingProps = {
  value: number;
  size?: 'sm' | 'md';
  className?: string;
};

export function StarRatingDisplay({
  value,
  size = 'md',
  className = '',
}: StarRatingProps) {
  const sizeClass = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-mkt-accent ${sizeClass} ${className}`}
      aria-label={`별점 ${value}점`}
    >
      {Array.from({ length: REVIEW_RATING_MAX }, (_, index) => {
        const filled = index < value;

        return (
          <span key={index} aria-hidden="true">
            {filled ? '★' : '☆'}
          </span>
        );
      })}
    </span>
  );
}

type StarRatingInputProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  className = '',
}: StarRatingInputProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: REVIEW_RATING_MAX }, (_, index) => {
        const rating = index + 1;
        const filled = rating <= value;

        return (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => onChange(rating)}
            className={`text-2xl transition-colors ${
              filled ? 'text-mkt-accent' : 'text-mkt-border'
            } disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={`${rating}점`}
          >
            {filled ? '★' : '☆'}
          </button>
        );
      })}
      <span className="ml-2 text-sm text-mkt-text-subtle">
        {value}/{REVIEW_RATING_MAX}
      </span>
    </div>
  );
}

export function isValidReviewRating(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= REVIEW_RATING_MIN &&
    value <= REVIEW_RATING_MAX
  );
}
