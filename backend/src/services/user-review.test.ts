import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HOME_FEATURED_REVIEW_MAX_COUNT,
  maskAuthorName,
  serializeHomeFeaturedReview,
  serializeUserReview,
  validateFeaturedOnHomeInput,
  validateReplyInput,
  validateReviewInput,
  validateStatusInput,
} from './user-review';

vi.mock('./subscription', () => ({
  hasActiveSubscription: vi.fn(),
  isStudentUser: vi.fn(),
}));

vi.mock('./manager-access', () => ({
  isApprovedManager: vi.fn(),
}));

import { assertCanWriteReview } from './user-review';
import { hasActiveSubscription, isStudentUser } from './subscription';
import { isApprovedManager } from './manager-access';

describe('maskAuthorName', () => {
  it('masks names longer than two characters', () => {
    expect(maskAuthorName('홍길동')).toBe('홍길*');
    expect(maskAuthorName('student01')).toBe('st*******');
  });

  it('keeps one- or two-character names as-is', () => {
    expect(maskAuthorName('ab')).toBe('ab');
    expect(maskAuthorName('가')).toBe('가');
  });

  it('returns 익명 for empty names', () => {
    expect(maskAuthorName('')).toBe('익명');
    expect(maskAuthorName('   ')).toBe('익명');
  });
});

describe('validateReviewInput', () => {
  it('accepts valid review input', () => {
    expect(validateReviewInput({ content: '좋아요', rating: 5 })).toEqual({
      data: { content: '좋아요', rating: 5 },
    });
  });

  it('rejects invalid rating', () => {
    expect(validateReviewInput({ content: '좋아요', rating: 6 })).toEqual({
      error: '별점은 1~5 사이 정수로 선택해 주세요.',
    });
  });
});

describe('validateReplyInput', () => {
  it('accepts valid reply input', () => {
    expect(validateReplyInput({ reply: '감사합니다.' })).toEqual({
      data: { reply: '감사합니다.' },
    });
  });
});

describe('validateStatusInput', () => {
  it('accepts published and hidden', () => {
    expect(validateStatusInput({ status: 'published' })).toEqual({
      data: { status: 'published' },
    });
    expect(validateStatusInput({ status: 'hidden' })).toEqual({
      data: { status: 'hidden' },
    });
  });

  it('rejects other statuses', () => {
    expect(validateStatusInput({ status: 'pending' })).toEqual({
      error: 'status는 published 또는 hidden 이어야 합니다.',
    });
  });
});

describe('validateFeaturedOnHomeInput', () => {
  it('accepts boolean featuredOnHome', () => {
    expect(validateFeaturedOnHomeInput({ featuredOnHome: true })).toEqual({
      data: { featuredOnHome: true },
    });
    expect(validateFeaturedOnHomeInput({ featuredOnHome: false })).toEqual({
      data: { featuredOnHome: false },
    });
  });

  it('rejects non-boolean values', () => {
    expect(validateFeaturedOnHomeInput({ featuredOnHome: 'yes' })).toEqual({
      error: 'featuredOnHome은 true 또는 false 여야 합니다.',
    });
  });
});

describe('serializeHomeFeaturedReview', () => {
  it('omits reply and masks author name', () => {
    expect(
      serializeHomeFeaturedReview({
        id: 1,
        content: '좋아요',
        rating: 5,
        status: 'published',
        featuredOnHome: true,
        reply: '감사합니다',
        author: { id: 2, username: '홍길동' },
        createdAt: '2026-06-24T00:00:00.000Z',
        updatedAt: '2026-06-24T00:00:00.000Z',
      })
    ).toEqual({
      id: 1,
      content: '좋아요',
      rating: 5,
      authorName: '홍길*',
      createdAt: '2026-06-24T00:00:00.000Z',
    });
  });
});

describe('HOME_FEATURED_REVIEW_MAX_COUNT', () => {
  it('caps home featured reviews at five', () => {
    expect(HOME_FEATURED_REVIEW_MAX_COUNT).toBe(5);
  });
});

describe('serializeUserReview', () => {
  it('masks author names for public responses', () => {
    expect(
      serializeUserReview(
        {
          id: 1,
          content: '좋아요',
          rating: 5,
          status: 'published',
          featuredOnHome: false,
          author: { id: 2, username: '홍길동' },
          createdAt: '2026-06-24T00:00:00.000Z',
          updatedAt: '2026-06-24T00:00:00.000Z',
        },
        { showFullAuthor: false }
      ).authorName
    ).toBe('홍길*');
  });

  it('shows full author names for operator responses', () => {
    expect(
      serializeUserReview(
        {
          id: 1,
          content: '좋아요',
          rating: 5,
          status: 'pending',
          featuredOnHome: false,
          author: { id: 2, username: '홍길동' },
          createdAt: '2026-06-24T00:00:00.000Z',
          updatedAt: '2026-06-24T00:00:00.000Z',
        },
        { showFullAuthor: true }
      ).authorName
    ).toBe('홍길동');
  });
});

describe('assertCanWriteReview', () => {
  const strapi = {} as never;

  beforeEach(() => {
    vi.mocked(isStudentUser).mockReset();
    vi.mocked(hasActiveSubscription).mockReset();
    vi.mocked(isApprovedManager).mockReset();
  });

  it('allows active student subscribers', async () => {
    vi.mocked(isStudentUser).mockResolvedValue(true);
    vi.mocked(hasActiveSubscription).mockResolvedValue(true);

    await expect(assertCanWriteReview(strapi, 1)).resolves.toEqual({ ok: true });
  });

  it('allows approved managers without subscription', async () => {
    vi.mocked(isStudentUser).mockResolvedValue(false);
    vi.mocked(isApprovedManager).mockResolvedValue(true);

    await expect(assertCanWriteReview(strapi, 1)).resolves.toEqual({ ok: true });
  });

  it('rejects other accounts', async () => {
    vi.mocked(isStudentUser).mockResolvedValue(false);
    vi.mocked(isApprovedManager).mockResolvedValue(false);

    await expect(assertCanWriteReview(strapi, 1)).resolves.toEqual({
      ok: false,
      error: '학생 또는 승인된 매니저만 사용후기를 작성할 수 있습니다.',
      status: 403,
    });
  });

  it('rejects expired subscriptions', async () => {
    vi.mocked(isStudentUser).mockResolvedValue(true);
    vi.mocked(hasActiveSubscription).mockResolvedValue(false);

    await expect(assertCanWriteReview(strapi, 1)).resolves.toEqual({
      ok: false,
      error: '구독이 만료되어 사용후기를 작성할 수 없습니다.',
      status: 403,
    });
  });
});
