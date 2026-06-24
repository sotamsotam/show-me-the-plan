import { factories, type Core } from '@strapi/strapi';
import { isOperatorUser } from '../../../services/operator';
import {
  USER_REVIEW_POPULATE,
  USER_REVIEW_UID,
  assertCanWriteReview,
  findAllReviewsForOps,
  findHomeFeaturedReviews,
  findOwnedReview,
  findPublishedReviews,
  findReviewById,
  findReviewsByAuthor,
  serializeUserReview,
  updateReviewFeaturedOnHomeForOps,
  updateReviewReplyForOps,
  updateReviewStatusForOps,
  validateReviewInput,
} from '../../../services/user-review';

function getAuthUserId(ctx: { state: { user?: { id?: number } } }): number | null {
  const userId = ctx.state.user?.id;

  if (!userId) {
    return null;
  }

  return Number(userId);
}

function parseReviewId(raw: unknown): number | null {
  const id = Number(raw);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

async function requireOperator(
  strapi: Core.Strapi,
  ctx: { forbidden: (message?: string) => void },
  userId: number
): Promise<boolean> {
  if (!(await isOperatorUser(strapi, userId))) {
    ctx.forbidden('운영자만 접근할 수 있습니다.');
    return false;
  }

  return true;
}

export default factories.createCoreController(USER_REVIEW_UID, ({ strapi }) => ({
  async findPublished(ctx) {
    const reviews = await findPublishedReviews(strapi);

    return ctx.send({ reviews });
  },

  async findHomeFeatured(ctx) {
    const reviews = await findHomeFeaturedReviews(strapi);

    return ctx.send({ reviews });
  },

  async findMine(ctx) {
    const userId = getAuthUserId(ctx);

    if (!userId) {
      return ctx.unauthorized('로그인이 필요합니다.');
    }

    const reviews = await findReviewsByAuthor(strapi, userId);

    return ctx.send({ reviews });
  },

  async findOps(ctx) {
    const userId = getAuthUserId(ctx);

    if (!userId) {
      return ctx.unauthorized('로그인이 필요합니다.');
    }

    if (!(await requireOperator(strapi, ctx, userId))) {
      return;
    }

    const reviews = await findAllReviewsForOps(strapi);

    return ctx.send({ reviews });
  },

  async create(ctx) {
    const userId = getAuthUserId(ctx);

    if (!userId) {
      return ctx.unauthorized('로그인이 필요합니다.');
    }

    const access = await assertCanWriteReview(strapi, userId);

    if (access.ok === false) {
      return ctx.forbidden(access.error);
    }

    const validated = validateReviewInput(ctx.request.body);

    if ('error' in validated) {
      return ctx.badRequest(validated.error);
    }

    const row = (await strapi.db.query(USER_REVIEW_UID).create({
      data: {
        content: validated.data.content,
        rating: validated.data.rating,
        status: 'pending',
        author: userId,
      },
      populate: USER_REVIEW_POPULATE,
    })) as Parameters<typeof serializeUserReview>[0];

    return ctx.send({
      review: serializeUserReview(row, { showFullAuthor: true }),
    });
  },

  async update(ctx) {
    const userId = getAuthUserId(ctx);

    if (!userId) {
      return ctx.unauthorized('로그인이 필요합니다.');
    }

    const id = parseReviewId(ctx.params.id);

    if (!id) {
      return ctx.badRequest('유효하지 않은 후기 ID입니다.');
    }

    const existing = await findOwnedReview(strapi, userId, id);

    if (!existing) {
      return ctx.notFound('후기를 찾을 수 없습니다.');
    }

    const validated = validateReviewInput(ctx.request.body);

    if ('error' in validated) {
      return ctx.badRequest(validated.error);
    }

    const row = (await strapi.db.query(USER_REVIEW_UID).update({
      where: { id },
      data: {
        content: validated.data.content,
        rating: validated.data.rating,
      },
      populate: USER_REVIEW_POPULATE,
    })) as Parameters<typeof serializeUserReview>[0];

    return ctx.send({
      review: serializeUserReview(row, { showFullAuthor: true }),
    });
  },

  async remove(ctx) {
    const userId = getAuthUserId(ctx);

    if (!userId) {
      return ctx.unauthorized('로그인이 필요합니다.');
    }

    const id = parseReviewId(ctx.params.id);

    if (!id) {
      return ctx.badRequest('유효하지 않은 후기 ID입니다.');
    }

    const existing = await findOwnedReview(strapi, userId, id);

    if (!existing) {
      return ctx.notFound('후기를 찾을 수 없습니다.');
    }

    await strapi.db.query(USER_REVIEW_UID).delete({
      where: { id },
    });

    return ctx.send({ ok: true });
  },

  async updateReply(ctx) {
    const userId = getAuthUserId(ctx);

    if (!userId) {
      return ctx.unauthorized('로그인이 필요합니다.');
    }

    if (!(await requireOperator(strapi, ctx, userId))) {
      return;
    }

    const id = parseReviewId(ctx.params.id);

    if (!id) {
      return ctx.badRequest('유효하지 않은 후기 ID입니다.');
    }

    const existing = await findReviewById(strapi, id);

    if (!existing) {
      return ctx.notFound('후기를 찾을 수 없습니다.');
    }

    const result = await updateReviewReplyForOps(
      strapi,
      id,
      ctx.request.body,
      userId
    );

    if ('error' in result) {
      return result.status === 404
        ? ctx.notFound(result.error)
        : ctx.badRequest(result.error);
    }

    return ctx.send({ review: result.review });
  },

  async updateStatus(ctx) {
    const userId = getAuthUserId(ctx);

    if (!userId) {
      return ctx.unauthorized('로그인이 필요합니다.');
    }

    if (!(await requireOperator(strapi, ctx, userId))) {
      return;
    }

    const id = parseReviewId(ctx.params.id);

    if (!id) {
      return ctx.badRequest('유효하지 않은 후기 ID입니다.');
    }

    const result = await updateReviewStatusForOps(strapi, id, ctx.request.body);

    if ('error' in result) {
      return result.status === 404
        ? ctx.notFound(result.error)
        : ctx.badRequest(result.error);
    }

    return ctx.send({ review: result.review });
  },

  async updateFeaturedOnHome(ctx) {
    const userId = getAuthUserId(ctx);

    if (!userId) {
      return ctx.unauthorized('로그인이 필요합니다.');
    }

    if (!(await requireOperator(strapi, ctx, userId))) {
      return;
    }

    const id = parseReviewId(ctx.params.id);

    if (!id) {
      return ctx.badRequest('유효하지 않은 후기 ID입니다.');
    }

    const result = await updateReviewFeaturedOnHomeForOps(
      strapi,
      id,
      ctx.request.body
    );

    if ('error' in result) {
      return result.status === 404
        ? ctx.notFound(result.error)
        : ctx.badRequest(result.error);
    }

    return ctx.send({ review: result.review });
  },
}));
