import { factories } from '@strapi/strapi';
import { assertBillingInternalAccess } from '../../../services/billing-internal-auth';
import {
  applyFreePeriodGrant,
  applyPaymentFailure,
  applyPaymentSuccess,
  cancelSubscriptionAtPeriodEnd,
  getPaymentHistoryForUser,
  listRenewalCandidates,
  saveBillingKey,
  type PaymentSuccessInput,
} from '../../../services/subscription-billing';
import {
  getSubscriptionSummaryForUser,
  isStudentUser,
  expireSubscriptionForQa,
} from '../../../services/subscription';

export default factories.createCoreController(
  'api::subscription.subscription',
  ({ strapi }) => ({
    async me(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      if (!(await isStudentUser(strapi, user.id))) {
        return ctx.forbidden('학생 계정만 구독 정보를 조회할 수 있습니다.');
      }

      const summary = await getSubscriptionSummaryForUser(strapi, user.id);

      if (!summary) {
        return ctx.notFound('구독 정보를 찾을 수 없습니다.');
      }

      return ctx.send({ subscription: summary });
    },

    async paymentHistory(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      if (!(await isStudentUser(strapi, user.id))) {
        return ctx.forbidden('학생 계정만 결제 내역을 조회할 수 있습니다.');
      }

      const payments = await getPaymentHistoryForUser(strapi, user.id);
      return ctx.send({ payments });
    },

    async cancel(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      if (!(await isStudentUser(strapi, user.id))) {
        return ctx.forbidden('학생 계정만 구독을 해지할 수 있습니다.');
      }

      const updated = await cancelSubscriptionAtPeriodEnd(strapi, user.id);

      if (!updated) {
        return ctx.notFound('구독 정보를 찾을 수 없습니다.');
      }

      const summary = await getSubscriptionSummaryForUser(strapi, user.id);
      return ctx.send({ subscription: summary });
    },

    async internalPaymentSucceeded(ctx) {
      const denied = assertBillingInternalAccess(ctx);
      if (!denied) {
        return;
      }

      const body = ctx.request.body as Partial<PaymentSuccessInput>;

      if (
        !body.userId ||
        !body.planCode ||
        !body.pgPaymentId ||
        body.planPrice == null ||
        body.discountAmount == null ||
        body.amount == null
      ) {
        return ctx.badRequest('Invalid payment payload.');
      }

      const updated = await applyPaymentSuccess(strapi, {
        userId: Number(body.userId),
        planCode: String(body.planCode),
        pgPaymentId: String(body.pgPaymentId),
        planPrice: Number(body.planPrice),
        discountAmount: Number(body.discountAmount),
        amount: Number(body.amount),
        receiptUrl: body.receiptUrl ?? null,
        pgBillingKey: body.pgBillingKey ?? null,
        pgCustomerId: body.pgCustomerId ?? null,
        paidAt: body.paidAt ?? null,
      });

      if (!updated) {
        return ctx.notFound('Subscription not found.');
      }

      return ctx.send({ ok: true });
    },

    async internalPaymentFailed(ctx) {
      const denied = assertBillingInternalAccess(ctx);
      if (!denied) {
        return;
      }

      const { userId, pgPaymentId } = ctx.request.body as {
        userId?: number;
        pgPaymentId?: string;
      };

      if (!userId) {
        return ctx.badRequest('userId is required.');
      }

      await applyPaymentFailure(strapi, Number(userId), pgPaymentId ?? null);
      return ctx.send({ ok: true });
    },

    async internalSaveBillingKey(ctx) {
      const denied = assertBillingInternalAccess(ctx);
      if (!denied) {
        return;
      }

      const { userId, planCode, billingKey, customerKey } = ctx.request.body as {
        userId?: number;
        planCode?: string;
        billingKey?: string;
        customerKey?: string;
      };

      if (!userId || !planCode || !billingKey || !customerKey) {
        return ctx.badRequest('Invalid billing key payload.');
      }

      const updated = await saveBillingKey(
        strapi,
        Number(userId),
        String(planCode),
        String(billingKey),
        String(customerKey)
      );

      if (!updated) {
        return ctx.notFound('Subscription not found.');
      }

      return ctx.send({ ok: true });
    },

    async internalGrantFreePeriod(ctx) {
      const denied = assertBillingInternalAccess(ctx);
      if (!denied) {
        return;
      }

      const { userId, planCode } = ctx.request.body as {
        userId?: number;
        planCode?: string;
      };

      if (!userId || !planCode) {
        return ctx.badRequest('userId and planCode are required.');
      }

      const updated = await applyFreePeriodGrant(
        strapi,
        Number(userId),
        String(planCode)
      );

      if (!updated) {
        return ctx.badRequest('Free period grant failed.');
      }

      return ctx.send({ ok: true });
    },

    async internalRenewalCandidates(ctx) {
      const denied = assertBillingInternalAccess(ctx);
      if (!denied) {
        return;
      }

      const candidates = await listRenewalCandidates(strapi);
      return ctx.send({ candidates });
    },

    async internalExpireForQa(ctx) {
      if (!assertBillingInternalAccess(ctx)) {
        return;
      }

      const userId = Number((ctx.request.body as { userId?: number })?.userId);
      if (!Number.isFinite(userId) || userId <= 0) {
        return ctx.badRequest('userId is required');
      }

      const ok = await expireSubscriptionForQa(strapi, userId);
      if (!ok) {
        return ctx.notFound('Student subscription not found');
      }

      const summary = await getSubscriptionSummaryForUser(strapi, userId);
      return ctx.send({ subscription: summary });
    },
  })
);
