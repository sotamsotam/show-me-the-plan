import { isAnyStudent } from '@/types/school';

export const USER_REVIEW_STATUSES = ['pending', 'published', 'hidden'] as const;
export type UserReviewStatus = (typeof USER_REVIEW_STATUSES)[number];

export const REVIEW_CONTENT_MAX_LENGTH = 2000;
export const REVIEW_REPLY_MAX_LENGTH = 1000;
export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;
export const REVIEW_RATING_OPTIONS = [1, 2, 3, 4, 5] as const;
export const HOME_FEATURED_REVIEW_MAX_COUNT = 5;

export interface UserReview {
  id: number;
  content: string;
  rating: number;
  status: UserReviewStatus;
  featuredOnHome: boolean;
  authorName: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HomeFeaturedReview {
  id: number;
  content: string;
  rating: number;
  authorName: string;
  createdAt: string;
}

export interface UserReviewInput {
  content: string;
  rating: number;
}

export interface UserReviewReplyInput {
  reply: string;
}

export interface UserReviewStatusInput {
  status: 'published' | 'hidden';
}

export const USER_REVIEW_STATUS_LABELS: Record<UserReviewStatus, string> = {
  pending: '승인 대기',
  published: '공개',
  hidden: '숨김',
};

export function parseUserReviewError(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const error = (data as { error?: unknown }).error;

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === 'string') {
      return message;
    }
  }

  return fallback;
}

export function formatReviewDate(iso: string): string {
  const parsed = new Date(iso);

  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return parsed.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export type ReviewAuthorSession = {
  isOperator?: boolean;
  roleType?: string;
  managerStatus?: string | null;
  schoolLevel?: string | null;
  subscription?: { isAccessAllowed?: boolean } | null;
};

export function isReviewAuthorMember(
  user: ReviewAuthorSession | null | undefined
): boolean {
  if (!user || user.isOperator) {
    return false;
  }

  if (isAnyStudent(user.schoolLevel)) {
    return true;
  }

  if (user.schoolLevel === 'manager' && user.managerStatus === 'approved') {
    return true;
  }

  return user.roleType === 'manager';
}

export function canWriteUserReview(
  user: ReviewAuthorSession | null | undefined
): boolean {
  if (!user || !isReviewAuthorMember(user)) {
    return false;
  }

  if (isAnyStudent(user.schoolLevel)) {
    return user.subscription?.isAccessAllowed === true;
  }

  return true;
}

export type UserReviewLoadErrorKey = 'published' | 'mine' | 'operator';

export type UserReviewLoadErrors = Partial<
  Record<UserReviewLoadErrorKey, string>
>;
