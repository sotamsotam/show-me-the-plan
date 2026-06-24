import type { Core } from '@strapi/strapi';
import { isApprovedManager } from './manager-access';
import { hasActiveSubscription, isStudentUser } from './subscription';

export const USER_REVIEW_UID = 'api::user-review.user-review' as const;

export const REVIEW_CONTENT_MAX_LENGTH = 2000;
export const REVIEW_REPLY_MAX_LENGTH = 1000;
export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;
export const HOME_FEATURED_REVIEW_MAX_COUNT = 5;

export const USER_REVIEW_STATUSES = ['pending', 'published', 'hidden'] as const;
export type UserReviewStatus = (typeof USER_REVIEW_STATUSES)[number];

export const USER_REVIEW_OPERATOR_STATUSES = ['published', 'hidden'] as const;
export type UserReviewOperatorStatus = (typeof USER_REVIEW_OPERATOR_STATUSES)[number];

export interface UserReviewInput {
  content: string;
  rating: number;
}

export interface UserReviewReplyInput {
  reply: string;
}

export interface UserReviewStatusInput {
  status: UserReviewOperatorStatus;
}

export interface UserReviewFeaturedOnHomeInput {
  featuredOnHome: boolean;
}

export interface SerializedUserReview {
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

export interface SerializedHomeFeaturedReview {
  id: number;
  content: string;
  rating: number;
  authorName: string;
  createdAt: string;
}

type ReviewRelationUser = {
  id: number;
  username?: string | null;
};

export type UserReviewRow = {
  id: number;
  content: string;
  rating: number;
  status: string;
  featuredOnHome?: boolean | null;
  reply?: string | null;
  repliedAt?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  author?: ReviewRelationUser | number | null;
  repliedBy?: ReviewRelationUser | number | null;
};

const REVIEW_POPULATE = ['author', 'repliedBy'] as const;

export function maskAuthorName(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    return '익명';
  }

  if (trimmed.length <= 2) {
    return trimmed;
  }

  return `${trimmed.slice(0, 2)}${'*'.repeat(trimmed.length - 2)}`;
}

function readRelationUser(
  value: ReviewRelationUser | number | null | undefined
): ReviewRelationUser | null {
  if (!value || typeof value === 'number') {
    return null;
  }

  return value;
}

function toIsoString(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseRating(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isInteger(parsed)) {
    return null;
  }

  if (parsed < REVIEW_RATING_MIN || parsed > REVIEW_RATING_MAX) {
    return null;
  }

  return parsed;
}

export function validateReviewInput(
  body: unknown
): { data: UserReviewInput } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: '요청 본문이 올바르지 않습니다.' };
  }

  const content = normalizeText((body as { content?: unknown }).content);
  const rating = parseRating((body as { rating?: unknown }).rating);

  if (!content) {
    return { error: '후기 내용을 입력해 주세요.' };
  }

  if (content.length > REVIEW_CONTENT_MAX_LENGTH) {
    return {
      error: `후기 내용은 ${REVIEW_CONTENT_MAX_LENGTH}자 이하로 입력해 주세요.`,
    };
  }

  if (rating == null) {
    return { error: '별점은 1~5 사이 정수로 선택해 주세요.' };
  }

  return { data: { content, rating } };
}

export function validateReplyInput(
  body: unknown
): { data: UserReviewReplyInput } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: '요청 본문이 올바르지 않습니다.' };
  }

  const reply = normalizeText((body as { reply?: unknown }).reply);

  if (!reply) {
    return { error: '답글 내용을 입력해 주세요.' };
  }

  if (reply.length > REVIEW_REPLY_MAX_LENGTH) {
    return {
      error: `답글은 ${REVIEW_REPLY_MAX_LENGTH}자 이하로 입력해 주세요.`,
    };
  }

  return { data: { reply } };
}

export function validateStatusInput(
  body: unknown
): { data: UserReviewStatusInput } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: '요청 본문이 올바르지 않습니다.' };
  }

  const status = (body as { status?: unknown }).status;

  if (status !== 'published' && status !== 'hidden') {
    return { error: 'status는 published 또는 hidden 이어야 합니다.' };
  }

  return { data: { status } };
}

export function validateFeaturedOnHomeInput(
  body: unknown
): { data: UserReviewFeaturedOnHomeInput } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: '요청 본문이 올바르지 않습니다.' };
  }

  const featuredOnHome = (body as { featuredOnHome?: unknown }).featuredOnHome;

  if (typeof featuredOnHome !== 'boolean') {
    return { error: 'featuredOnHome은 true 또는 false 여야 합니다.' };
  }

  return { data: { featuredOnHome } };
}

export function serializeUserReview(
  row: UserReviewRow,
  options: { showFullAuthor: boolean }
): SerializedUserReview {
  const author = readRelationUser(row.author);
  const rawName = author?.username?.trim() || '익명';
  const authorName = options.showFullAuthor ? rawName : maskAuthorName(rawName);

  return {
    id: row.id,
    content: row.content,
    rating: row.rating,
    status: row.status as UserReviewStatus,
    featuredOnHome: row.featuredOnHome === true,
    authorName,
    reply: row.reply ?? null,
    repliedAt: toIsoString(row.repliedAt),
    createdAt: toIsoString(row.createdAt) ?? '',
    updatedAt: toIsoString(row.updatedAt) ?? '',
  };
}

export function serializeHomeFeaturedReview(
  row: UserReviewRow
): SerializedHomeFeaturedReview {
  const author = readRelationUser(row.author);
  const rawName = author?.username?.trim() || '익명';

  return {
    id: row.id,
    content: row.content,
    rating: row.rating,
    authorName: maskAuthorName(rawName),
    createdAt: toIsoString(row.createdAt) ?? '',
  };
}

export async function assertCanWriteReview(
  strapi: Core.Strapi,
  userId: number
): Promise<{ ok: true } | { ok: false; error: string; status: 403 }> {
  const isStudent = await isStudentUser(strapi, userId);

  if (isStudent) {
    const active = await hasActiveSubscription(strapi, userId);

    if (!active) {
      return {
        ok: false,
        error: '구독이 만료되어 사용후기를 작성할 수 없습니다.',
        status: 403,
      };
    }

    return { ok: true };
  }

  if (await isApprovedManager(strapi, userId)) {
    return { ok: true };
  }

  return {
    ok: false,
    error: '학생 또는 승인된 매니저만 사용후기를 작성할 수 있습니다.',
    status: 403,
  };
}

export async function findPublishedReviews(
  strapi: Core.Strapi
): Promise<SerializedUserReview[]> {
  const rows = (await strapi.db.query(USER_REVIEW_UID).findMany({
    where: { status: 'published' },
    orderBy: { createdAt: 'desc' },
    populate: REVIEW_POPULATE,
  })) as UserReviewRow[];

  return rows.map((row) => serializeUserReview(row, { showFullAuthor: false }));
}

export async function findHomeFeaturedReviews(
  strapi: Core.Strapi
): Promise<SerializedHomeFeaturedReview[]> {
  const rows = (await strapi.db.query(USER_REVIEW_UID).findMany({
    where: {
      status: 'published',
      featuredOnHome: true,
    },
    orderBy: { createdAt: 'desc' },
    limit: HOME_FEATURED_REVIEW_MAX_COUNT,
    populate: REVIEW_POPULATE,
  })) as UserReviewRow[];

  return rows.map((row) => serializeHomeFeaturedReview(row));
}

export async function findReviewsByAuthor(
  strapi: Core.Strapi,
  userId: number
): Promise<SerializedUserReview[]> {
  const rows = (await strapi.db.query(USER_REVIEW_UID).findMany({
    where: { author: userId },
    orderBy: { createdAt: 'desc' },
    populate: REVIEW_POPULATE,
  })) as UserReviewRow[];

  return rows.map((row) => serializeUserReview(row, { showFullAuthor: true }));
}

export async function findAllReviewsForOps(
  strapi: Core.Strapi
): Promise<SerializedUserReview[]> {
  const rows = (await strapi.db.query(USER_REVIEW_UID).findMany({
    orderBy: { createdAt: 'desc' },
    populate: REVIEW_POPULATE,
  })) as UserReviewRow[];

  return rows.map((row) => serializeUserReview(row, { showFullAuthor: true }));
}

export async function findOwnedReview(
  strapi: Core.Strapi,
  userId: number,
  id: number
): Promise<UserReviewRow | null> {
  return (await strapi.db.query(USER_REVIEW_UID).findOne({
    where: { id, author: userId },
    populate: REVIEW_POPULATE,
  })) as UserReviewRow | null;
}

export async function findReviewById(
  strapi: Core.Strapi,
  id: number
): Promise<UserReviewRow | null> {
  return (await strapi.db.query(USER_REVIEW_UID).findOne({
    where: { id },
    populate: REVIEW_POPULATE,
  })) as UserReviewRow | null;
}

export async function updateReviewStatusForOps(
  strapi: Core.Strapi,
  id: number,
  body: unknown
): Promise<
  { review: SerializedUserReview } | { error: string; status: 400 | 404 }
> {
  const existing = await findReviewById(strapi, id);

  if (!existing) {
    return { error: '후기를 찾을 수 없습니다.', status: 404 };
  }

  const validated = validateStatusInput(body);

  if ('error' in validated) {
    return { error: validated.error, status: 400 };
  }

  const row = (await strapi.db.query(USER_REVIEW_UID).update({
    where: { id },
    data: {
      status: validated.data.status,
      ...(validated.data.status === 'hidden' ? { featuredOnHome: false } : {}),
    },
    populate: REVIEW_POPULATE,
  })) as UserReviewRow;

  return {
    review: serializeUserReview(row, { showFullAuthor: true }),
  };
}

export async function updateReviewFeaturedOnHomeForOps(
  strapi: Core.Strapi,
  id: number,
  body: unknown
): Promise<
  { review: SerializedUserReview } | { error: string; status: 400 | 404 }
> {
  const existing = await findReviewById(strapi, id);

  if (!existing) {
    return { error: '후기를 찾을 수 없습니다.', status: 404 };
  }

  const validated = validateFeaturedOnHomeInput(body);

  if ('error' in validated) {
    return { error: validated.error, status: 400 };
  }

  if (validated.data.featuredOnHome && existing.status !== 'published') {
    return {
      error: '공개된 후기만 홈에 노출할 수 있습니다.',
      status: 400,
    };
  }

  const row = (await strapi.db.query(USER_REVIEW_UID).update({
    where: { id },
    data: { featuredOnHome: validated.data.featuredOnHome },
    populate: REVIEW_POPULATE,
  })) as UserReviewRow;

  return {
    review: serializeUserReview(row, { showFullAuthor: true }),
  };
}

export async function updateReviewReplyForOps(
  strapi: Core.Strapi,
  id: number,
  body: unknown,
  operatorUserId: number
): Promise<
  { review: SerializedUserReview } | { error: string; status: 400 | 404 }
> {
  const existing = await findReviewById(strapi, id);

  if (!existing) {
    return { error: '후기를 찾을 수 없습니다.', status: 404 };
  }

  const validated = validateReplyInput(body);

  if ('error' in validated) {
    return { error: validated.error, status: 400 };
  }

  const row = (await strapi.db.query(USER_REVIEW_UID).update({
    where: { id },
    data: {
      reply: validated.data.reply,
      repliedAt: new Date(),
      repliedBy: operatorUserId,
    },
    populate: REVIEW_POPULATE,
  })) as UserReviewRow;

  return {
    review: serializeUserReview(row, { showFullAuthor: true }),
  };
}

export const USER_REVIEW_POPULATE = REVIEW_POPULATE;
