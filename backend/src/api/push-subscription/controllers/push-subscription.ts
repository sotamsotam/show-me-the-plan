import { factories } from '@strapi/strapi';

import { PUSH_SUBSCRIPTION_UID } from '../../../services/push-notification-constants';

interface PushSubscriptionInput {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

function validateSubscriptionInput(body: PushSubscriptionInput): string | null {
  if (!body.endpoint || typeof body.endpoint !== 'string' || !body.endpoint.trim()) {
    return 'endpoint는 필수입니다.';
  }

  if (!body.keys || typeof body.keys !== 'object') {
    return 'keys는 필수입니다.';
  }

  if (!body.keys.p256dh || typeof body.keys.p256dh !== 'string') {
    return 'keys.p256dh는 필수입니다.';
  }

  if (!body.keys.auth || typeof body.keys.auth !== 'string') {
    return 'keys.auth는 필수입니다.';
  }

  return null;
}

export default factories.createCoreController(PUSH_SUBSCRIPTION_UID, ({ strapi }) => ({
  async subscribe(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('로그인이 필요합니다.');
    }

    const body = ctx.request.body as PushSubscriptionInput;
    const error = validateSubscriptionInput(body);

    if (error) {
      return ctx.badRequest(error);
    }

    const endpoint = body.endpoint!.trim();
    const p256dh = body.keys!.p256dh!.trim();
    const auth = body.keys!.auth!.trim();

    const existing = await strapi.db.query(PUSH_SUBSCRIPTION_UID).findOne({
      where: { endpoint },
    });

    if (existing) {
      await strapi.db.query(PUSH_SUBSCRIPTION_UID).update({
        where: { id: existing.id },
        data: {
          user: user.id,
          p256dh,
          auth,
        },
      });
    } else {
      await strapi.db.query(PUSH_SUBSCRIPTION_UID).create({
        data: {
          user: user.id,
          endpoint,
          p256dh,
          auth,
        },
      });
    }

    return ctx.send({ ok: true });
  },

  async unsubscribe(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('로그인이 필요합니다.');
    }

    const body = ctx.request.body as PushSubscriptionInput;
    const endpoint = body.endpoint?.trim();

    if (!endpoint) {
      return ctx.badRequest('endpoint는 필수입니다.');
    }

    const existing = await strapi.db.query(PUSH_SUBSCRIPTION_UID).findOne({
      where: { endpoint, user: user.id },
    });

    if (existing) {
      await strapi.db.query(PUSH_SUBSCRIPTION_UID).delete({
        where: { id: existing.id },
      });
    }

    return ctx.send({ ok: true });
  },
}));
