import { describe, expect, it } from 'vitest';
import {
  canWriteUserReview,
  formatReviewDate,
  isReviewAuthorMember,
  parseUserReviewError,
} from './user-review';
import { isPublicApiPath } from './subscription-access';

describe('parseUserReviewError', () => {
  it('reads string error messages', () => {
    expect(parseUserReviewError({ error: '구독이 만료되었습니다.' }, 'fallback')).toBe(
      '구독이 만료되었습니다.'
    );
  });

  it('reads Strapi error objects', () => {
    expect(
      parseUserReviewError({ error: { message: '로그인이 필요합니다.' } }, 'fallback')
    ).toBe('로그인이 필요합니다.');
  });

  it('returns fallback for unknown shapes', () => {
    expect(parseUserReviewError(null, 'fallback')).toBe('fallback');
  });
});

describe('formatReviewDate', () => {
  it('formats ISO dates in Korean locale', () => {
    expect(formatReviewDate('2026-06-24T00:00:00.000Z')).toContain('2026');
  });
});

describe('canWriteUserReview', () => {
  it('allows active students', () => {
    expect(
      canWriteUserReview({
        schoolLevel: 'high',
        subscription: { isAccessAllowed: true },
      })
    ).toBe(true);
  });

  it('allows approved managers without subscription', () => {
    expect(
      canWriteUserReview({
        schoolLevel: 'manager',
        managerStatus: 'approved',
      })
    ).toBe(true);
  });

  it('rejects expired students', () => {
    expect(
      canWriteUserReview({
        schoolLevel: 'high',
        subscription: { isAccessAllowed: false },
      })
    ).toBe(false);
  });

  it('rejects pending managers', () => {
    expect(
      isReviewAuthorMember({
        schoolLevel: 'manager',
        managerStatus: 'pending',
      })
    ).toBe(false);
  });
});

describe('isPublicApiPath for user reviews', () => {
  it('allows the published reviews list endpoint', () => {
    expect(isPublicApiPath('/api/user-reviews')).toBe(true);
  });

  it('allows the home featured reviews endpoint', () => {
    expect(isPublicApiPath('/api/user-reviews/home-featured')).toBe(true);
  });

  it('keeps authenticated review endpoints protected by middleware', () => {
    expect(isPublicApiPath('/api/user-reviews/mine')).toBe(false);
    expect(isPublicApiPath('/api/user-reviews/ops')).toBe(false);
    expect(isPublicApiPath('/api/user-reviews/1/reply')).toBe(false);
    expect(isPublicApiPath('/api/user-reviews/1/home-featured')).toBe(false);
  });
});
