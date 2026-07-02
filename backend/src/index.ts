import type { Core } from '@strapi/strapi';
import { getClassInfo, searchSchools } from './services/neis';
import {
  backfillMissingStudentSubscriptions,
  expireDueSubscriptions,
  seedDefaultPlans,
} from './services/subscription';
import {
  approveOpsManager,
  getOpsDashboardSummary,
  getOpsSubscriptionDetail,
  listOpsMembers,
  listOpsPendingManagers,
  listOpsSubscriptions,
  markManagerPendingForQa,
  normalizeOpsDiscountInput,
  previewOpsSubscriptionDiscount,
  rejectOpsManager,
  updateOpsSubscriptionDiscount,
  updateOpsSubscriptionPoints,
} from './services/ops';
import { assertOpsInternalAccess, readOpsOperatorLabel } from './services/ops-internal-auth';
import {
  findAllReviewsForOps,
  updateReviewFeaturedOnHomeForOps,
  updateReviewReplyForOps,
  updateReviewStatusForOps,
} from './services/user-review';

async function ensureManagerRole(strapi: Core.Strapi) {
  const existing = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'manager' } });

  if (existing) {
    return existing;
  }

  return strapi.db.query('plugin::users-permissions.role').create({
    data: {
      name: 'Manager',
      description: 'Approved manager account',
      type: 'manager',
    },
  });
}

async function ensureRolePermission(
  strapi: Core.Strapi,
  roleType: 'public' | 'authenticated' | 'manager',
  action: string
) {
  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: roleType } });

  if (!role) {
    return;
  }

  const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
    where: { action, role: role.id },
  });

  if (!existing) {
    await strapi.db.query('plugin::users-permissions.permission').create({
      data: { action, role: role.id },
    });
  }
}

async function setupPasswordResetSettings(strapi: Core.Strapi) {
  const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
  if (!frontendUrl) {
    return;
  }

  const resetPasswordUrl = `${frontendUrl}/reset-password`;
  const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const defaultFromEmail = process.env.EMAIL_DEFAULT_FROM ?? 'no-reply@example.com';
  const defaultFromName = process.env.EMAIL_DEFAULT_NAME ?? 'Show Me The Plan';

  const advanced = (await pluginStore.get({ key: 'advanced' })) as Record<
    string,
    unknown
  > | null;

  await pluginStore.set({
    key: 'advanced',
    value: {
      ...(advanced ?? {}),
      email_reset_password: resetPasswordUrl,
    },
  });

  const email = (await pluginStore.get({ key: 'email' })) as Record<string, unknown> | null;
  const resetPassword = (email?.reset_password as Record<string, unknown>) ?? {};
  const options = (resetPassword.options as Record<string, unknown>) ?? {};

  await pluginStore.set({
    key: 'email',
    value: {
      ...(email ?? {}),
      reset_password: {
        ...resetPassword,
        options: {
          ...options,
          from: {
            name: defaultFromName,
            email: defaultFromEmail,
          },
          object: 'Show Me The Plan 비밀번호 재설정',
          message: `<p>안녕하세요,</p>
<p>비밀번호 재설정을 요청하셨습니다. 아래 링크를 클릭해 새 비밀번호를 설정해 주세요.</p>
<p><a href="<%= URL %>?code=<%= TOKEN %>"><%= URL %>?code=<%= TOKEN %></a></p>
<p>본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>
<p>Show Me The Plan</p>`,
        },
      },
    },
  });
}

async function setupPermissions(strapi: Core.Strapi) {
  await ensureRolePermission(
    strapi,
    'public',
    'api::user-profile.user-profile.registerWithProfile'
  );
  await ensureRolePermission(
    strapi,
    'public',
    'api::user-profile.user-profile.emailHintByUsername'
  );
  await ensureRolePermission(
    strapi,
    'public',
    'plugin::users-permissions.auth.forgotPassword'
  );
  await ensureRolePermission(
    strapi,
    'public',
    'plugin::users-permissions.auth.resetPassword'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.me'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.updateMe'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.deleteMe'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'plugin::users-permissions.auth.changePassword'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.timetable'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.examCountdownContext'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.updateExamPrepSettings'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.getExamPrepWeeklyPlans'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.updateExamPrepWeeklyPlans'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.carryOverExamPrepWeeklyPlanItem'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.deleteExamPrepWeeklyPlanItem'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.getExamPrepWeeklyPlanTemplates'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.createExamPrepWeeklyPlanTemplate'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.deleteExamPrepWeeklyPlanTemplate'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.getVacationPeriodSettings'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.updateVacationPeriodSettings'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.getVacationWeeklyPlans'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.updateVacationWeeklyPlans'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.getVacationWeeklyPlanTemplates'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.createVacationWeeklyPlanTemplate'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.deleteVacationWeeklyPlanTemplate'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.getRegularWeeklyPlans'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.updateRegularWeeklyPlans'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.getRegularWeeklyPlanTemplates'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.createRegularWeeklyPlanTemplate'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.deleteRegularWeeklyPlanTemplate'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.getSubjects'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.updateSubjects'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.searchManagers'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.listMyManagers'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.addMyManager'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.removeMyManager'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.listStudents'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-schedule.user-schedule.findInRange'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-schedule.user-schedule.create'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-schedule.user-schedule.update'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-schedule.user-schedule.remove'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-schedule.user-schedule.updateOccurrence'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-schedule.user-schedule.excludeOccurrence'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-schedule.user-schedule.detachOccurrence'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-schedule.user-schedule.moveOccurrence'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-schedule.user-schedule.uploadAttachment'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::study-plan-todo.study-plan-todo.findInRange'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::study-plan-todo.study-plan-todo.findTitles'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::study-plan-todo.study-plan-todo.create'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::study-plan-todo.study-plan-todo.update'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::study-plan-todo.study-plan-todo.remove'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::study-plan-todo.study-plan-todo.updateOccurrence'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::study-plan-todo.study-plan-todo.excludeOccurrence'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::study-plan-todo.study-plan-todo.detachOccurrence'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::study-plan-todo.study-plan-todo.updateExecution'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::push-subscription.push-subscription.subscribe'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::push-subscription.push-subscription.unsubscribe'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-profile.user-profile.updateNotificationsEnabled'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::todo-day-stamp.todo-day-stamp.findInRange'
  );
  await ensureRolePermission(
    strapi,
    'public',
    'api::user-review.user-review.findPublished'
  );
  await ensureRolePermission(
    strapi,
    'public',
    'api::user-review.user-review.findHomeFeatured'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-review.user-review.findMine'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-review.user-review.findOps'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-review.user-review.create'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-review.user-review.update'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-review.user-review.remove'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-review.user-review.updateReply'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-review.user-review.updateStatus'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::user-review.user-review.updateFeaturedOnHome'
  );

  await ensureManagerRole(strapi);

  const managerActions = [
    'api::user-profile.user-profile.me',
    'api::user-profile.user-profile.updateMe',
    'api::user-profile.user-profile.deleteMe',
    'api::user-profile.user-profile.timetable',
    'api::user-profile.user-profile.examCountdownContext',
    'api::user-profile.user-profile.updateExamPrepSettings',
    'api::user-profile.user-profile.getExamPrepWeeklyPlans',
    'api::user-profile.user-profile.updateExamPrepWeeklyPlans',
    'api::user-profile.user-profile.carryOverExamPrepWeeklyPlanItem',
    'api::user-profile.user-profile.deleteExamPrepWeeklyPlanItem',
    'api::user-profile.user-profile.getExamPrepWeeklyPlanTemplates',
    'api::user-profile.user-profile.createExamPrepWeeklyPlanTemplate',
    'api::user-profile.user-profile.deleteExamPrepWeeklyPlanTemplate',
    'api::user-profile.user-profile.getVacationPeriodSettings',
    'api::user-profile.user-profile.updateVacationPeriodSettings',
    'api::user-profile.user-profile.getVacationWeeklyPlans',
    'api::user-profile.user-profile.updateVacationWeeklyPlans',
    'api::user-profile.user-profile.getVacationWeeklyPlanTemplates',
    'api::user-profile.user-profile.createVacationWeeklyPlanTemplate',
    'api::user-profile.user-profile.deleteVacationWeeklyPlanTemplate',
    'api::user-profile.user-profile.getRegularWeeklyPlans',
    'api::user-profile.user-profile.updateRegularWeeklyPlans',
    'api::user-profile.user-profile.getRegularWeeklyPlanTemplates',
    'api::user-profile.user-profile.createRegularWeeklyPlanTemplate',
    'api::user-profile.user-profile.deleteRegularWeeklyPlanTemplate',
    'api::user-profile.user-profile.listStudents',
    'plugin::users-permissions.auth.changePassword',
    'api::user-schedule.user-schedule.findInRange',
    'api::user-schedule.user-schedule.create',
    'api::user-schedule.user-schedule.update',
    'api::user-schedule.user-schedule.remove',
    'api::user-schedule.user-schedule.updateOccurrence',
    'api::user-schedule.user-schedule.excludeOccurrence',
    'api::user-schedule.user-schedule.detachOccurrence',
    'api::user-schedule.user-schedule.moveOccurrence',
    'api::user-schedule.user-schedule.uploadAttachment',
    'api::study-plan-todo.study-plan-todo.findInRange',
    'api::study-plan-todo.study-plan-todo.findTitles',
    'api::study-plan-todo.study-plan-todo.create',
    'api::study-plan-todo.study-plan-todo.update',
    'api::study-plan-todo.study-plan-todo.remove',
    'api::study-plan-todo.study-plan-todo.updateOccurrence',
    'api::study-plan-todo.study-plan-todo.excludeOccurrence',
    'api::study-plan-todo.study-plan-todo.detachOccurrence',
    'api::study-plan-todo.study-plan-todo.updateExecution',
    'api::push-subscription.push-subscription.subscribe',
    'api::push-subscription.push-subscription.unsubscribe',
    'api::user-profile.user-profile.updateNotificationsEnabled',
    'api::todo-day-stamp.todo-day-stamp.findInRange',
    'api::todo-day-stamp.todo-day-stamp.upsertForDate',
    'api::user-review.user-review.findMine',
    'api::user-review.user-review.create',
    'api::user-review.user-review.update',
    'api::user-review.user-review.remove',
  ];

  for (const action of managerActions) {
    await ensureRolePermission(strapi, 'manager', action);
  }

  await ensureRolePermission(strapi, 'public', 'api::plan.plan.listActive');
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::subscription.subscription.me'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::subscription.subscription.paymentHistory'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::subscription.subscription.cancel'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::subscription.subscription.resumeCancel'
  );
  await ensureRolePermission(
    strapi,
    'authenticated',
    'api::subscription.subscription.usePoints'
  );
}

async function setupBilling(strapi: Core.Strapi) {
  await seedDefaultPlans(strapi);

  const created = await backfillMissingStudentSubscriptions(strapi);
  if (created > 0) {
    strapi.log.info(`Backfilled ${created} student trial subscriptions`);
  }

  const expired = await expireDueSubscriptions(strapi);
  if (expired > 0) {
    strapi.log.info(`Marked ${expired} subscriptions as expired`);
  }
}

async function fixLegacyUsersWithoutProvider(strapi: Core.Strapi) {
  await strapi.db.connection('up_users').whereNull('provider').update({ provider: 'local' });
  await strapi.db.connection('up_users').where('provider', '').update({ provider: 'local' });
}

async function ensureNotificationIndexes(strapi: Core.Strapi) {
  const clientConfig = strapi.db.connection.client.config?.client;

  if (clientConfig !== 'pg' && clientConfig !== 'postgres') {
    return;
  }

  const statements = [
    `
      CREATE INDEX IF NOT EXISTS idx_notifications_pending_send_at
      ON notifications (send_at)
      WHERE sent = false
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_notifications_todo_lnk_todo
      ON notifications_todo_lnk (study_plan_todo_id)
    `,
  ];

  const hasQueueKey = await strapi.db.connection.schema.hasColumn(
    'notifications',
    'queue_key'
  );

  if (hasQueueKey) {
    statements.push(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_pending_queue_key
      ON notifications (queue_key)
      WHERE sent = false
    `);
  }

  for (const statement of statements) {
    try {
      await strapi.db.connection.raw(statement);
    } catch (error) {
      strapi.log.warn(
        `[bootstrap] notification index setup failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

async function migrateLegacyDayOfWeek(strapi: Core.Strapi) {
  const tableName = 'user_schedules';
  const hasLegacyColumn = await strapi.db.connection.schema.hasColumn(
    tableName,
    'day_of_week'
  );

  if (!hasLegacyColumn) {
    return;
  }

  const rows = await strapi.db
    .connection(tableName)
    .select('id', 'day_of_week', 'days_of_week');

  for (const row of rows) {
    if (row.days_of_week != null) {
      continue;
    }

    if (row.day_of_week == null) {
      continue;
    }

    await strapi.db
      .connection(tableName)
      .where({ id: row.id })
      .update({ days_of_week: JSON.stringify([row.day_of_week]) });
  }
}

function registerNeisRoutes(strapi: Core.Strapi) {
  strapi.server.routes([
    {
      method: 'GET',
      path: '/api/neis/schools',
      handler: async (ctx) => {
        const { q = '', schoolLevel = '' } = ctx.query as {
          q?: string;
          schoolLevel?: string;
        };

        if (!schoolLevel) {
          return ctx.badRequest('schoolLevel은 필수입니다.');
        }

        if (
          schoolLevel !== 'elementary' &&
          schoolLevel !== 'middle' &&
          schoolLevel !== 'high'
        ) {
          return ctx.badRequest('초등학교, 중학교, 고등학교만 지원합니다.');
        }

        try {
          ctx.body = { schools: await searchSchools(String(q), String(schoolLevel)) };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : '학교 검색에 실패했습니다.';
          return ctx.badRequest(message);
        }
      },
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/api/neis/classes',
      handler: async (ctx) => {
        const {
          schoolLevel = '',
          atptOfcdcScCode = '',
          sdSchulCode = '',
          grade = '',
        } = ctx.query as {
          schoolLevel?: string;
          atptOfcdcScCode?: string;
          sdSchulCode?: string;
          grade?: string;
        };

        if (!schoolLevel || !atptOfcdcScCode || !sdSchulCode) {
          return ctx.badRequest(
            'schoolLevel, atptOfcdcScCode, sdSchulCode는 필수입니다.'
          );
        }

        if (
          schoolLevel !== 'elementary' &&
          schoolLevel !== 'middle' &&
          schoolLevel !== 'high'
        ) {
          return ctx.badRequest('초등학교, 중학교, 고등학교만 지원합니다.');
        }

        try {
          ctx.body = await getClassInfo(
            String(schoolLevel),
            String(atptOfcdcScCode),
            String(sdSchulCode),
            grade ? String(grade) : undefined
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : '학급 정보 조회에 실패했습니다.';
          return ctx.badRequest(message);
        }
      },
      config: { auth: false },
    },
  ]);
}

function registerOpsRoutes(strapi: Core.Strapi) {
  strapi.server.routes([
    {
      method: 'GET',
      path: '/api/ops/internal/dashboard/summary',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        ctx.body = await getOpsDashboardSummary(strapi);
      },
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/api/ops/internal/members',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        const {
          page,
          pageSize,
          schoolLevel,
          subscriptionStatus,
          q,
        } = ctx.query as {
          page?: string;
          pageSize?: string;
          schoolLevel?: string;
          subscriptionStatus?: string;
          q?: string;
        };

        ctx.body = await listOpsMembers(strapi, {
          page: page ? Number(page) : undefined,
          pageSize: pageSize ? Number(pageSize) : undefined,
          schoolLevel,
          subscriptionStatus,
          q,
        });
      },
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/api/ops/internal/subscriptions',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        const { page, pageSize, status, cancelAtPeriodEnd } = ctx.query as {
          page?: string;
          pageSize?: string;
          status?: string;
          cancelAtPeriodEnd?: string;
        };

        ctx.body = await listOpsSubscriptions(strapi, {
          page: page ? Number(page) : undefined,
          pageSize: pageSize ? Number(pageSize) : undefined,
          status,
          cancelAtPeriodEnd: cancelAtPeriodEnd === 'true' ? true : undefined,
        });
      },
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/api/ops/internal/subscriptions/:userId',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        const userId = Number(ctx.params.userId);
        if (!Number.isFinite(userId) || userId <= 0) {
          return ctx.badRequest('Invalid userId');
        }

        const detail = await getOpsSubscriptionDetail(strapi, userId);
        if (!detail) {
          return ctx.notFound('Member not found');
        }

        ctx.body = detail;
      },
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/api/ops/internal/subscriptions/:userId/discount/preview',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        const userId = Number(ctx.params.userId);
        if (!Number.isFinite(userId) || userId <= 0) {
          return ctx.badRequest('Invalid userId');
        }

        try {
          const input = normalizeOpsDiscountInput(
            (ctx.request.body ?? {}) as Record<string, unknown>
          );
          const preview = await previewOpsSubscriptionDiscount(strapi, userId, input);
          if (!preview) {
            return ctx.notFound('Subscription not found');
          }

          ctx.body = preview;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Invalid discount input';
          return ctx.badRequest(message);
        }
      },
      config: { auth: false },
    },
    {
      method: 'PATCH',
      path: '/api/ops/internal/subscriptions/:userId/discount',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        const userId = Number(ctx.params.userId);
        if (!Number.isFinite(userId) || userId <= 0) {
          return ctx.badRequest('Invalid userId');
        }

        const grantedBy = readOpsOperatorLabel(ctx.request.headers['x-ops-operator']);

        try {
          const input = normalizeOpsDiscountInput(
            (ctx.request.body ?? {}) as Record<string, unknown>
          );
          const result = await updateOpsSubscriptionDiscount(
            strapi,
            userId,
            input,
            grantedBy
          );

          if (!result) {
            return ctx.notFound('Subscription not found');
          }

          ctx.body = result;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Invalid discount input';
          return ctx.badRequest(message);
        }
      },
      config: { auth: false },
    },
    {
      method: 'PATCH',
      path: '/api/ops/internal/subscriptions/:userId/points',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        const userId = Number(ctx.params.userId);
        if (!Number.isFinite(userId) || userId <= 0) {
          return ctx.badRequest('Invalid userId');
        }

        const body = (ctx.request.body ?? {}) as { pointBalance?: unknown };
        const pointBalance = Number(body.pointBalance);

        try {
          const result = await updateOpsSubscriptionPoints(strapi, userId, pointBalance);

          if (!result) {
            return ctx.notFound('Subscription not found');
          }

          ctx.body = result;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Invalid point input';
          return ctx.badRequest(message);
        }
      },
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/api/ops/internal/managers/pending',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        ctx.body = { items: await listOpsPendingManagers(strapi) };
      },
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/api/ops/internal/managers/:userId/approve',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        const userId = Number(ctx.params.userId);
        if (!Number.isFinite(userId) || userId <= 0) {
          return ctx.badRequest('Invalid userId');
        }

        const result = await approveOpsManager(strapi, userId);
        if (!result) {
          return ctx.notFound('Pending manager not found');
        }

        ctx.body = result;
      },
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/api/ops/internal/managers/:userId/reject',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        const userId = Number(ctx.params.userId);
        if (!Number.isFinite(userId) || userId <= 0) {
          return ctx.badRequest('Invalid userId');
        }

        const result = await rejectOpsManager(strapi, userId);
        if (!result) {
          return ctx.notFound('Pending manager not found');
        }

        ctx.body = result;
      },
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/api/ops/internal/qa/managers/:userId/mark-pending',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        const userId = Number(ctx.params.userId);
        if (!Number.isFinite(userId) || userId <= 0) {
          return ctx.badRequest('Invalid userId');
        }

        const result = await markManagerPendingForQa(strapi, userId);
        if (!result) {
          return ctx.notFound('Manager not found');
        }

        ctx.body = result;
      },
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/api/user-reviews/internal/ops',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        ctx.body = { reviews: await findAllReviewsForOps(strapi) };
      },
      config: { auth: false },
    },
    {
      method: 'PUT',
      path: '/api/user-reviews/internal/:id/reply',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        const id = Number(ctx.params.id);
        if (!Number.isInteger(id) || id <= 0) {
          return ctx.badRequest('유효하지 않은 후기 ID입니다.');
        }

        const body = (ctx.request.body ?? {}) as Record<string, unknown>;
        const operatorUserId = Number(body.operatorUserId);

        if (!Number.isInteger(operatorUserId) || operatorUserId <= 0) {
          return ctx.badRequest('operatorUserId is required');
        }

        const { operatorUserId: _operatorUserId, ...replyBody } = body;
        const result = await updateReviewReplyForOps(
          strapi,
          id,
          replyBody,
          operatorUserId
        );

        if ('error' in result) {
          return result.status === 404
            ? ctx.notFound(result.error)
            : ctx.badRequest(result.error);
        }

        ctx.body = { review: result.review };
      },
      config: { auth: false },
    },
    {
      method: 'PUT',
      path: '/api/user-reviews/internal/:id/status',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        const id = Number(ctx.params.id);
        if (!Number.isInteger(id) || id <= 0) {
          return ctx.badRequest('유효하지 않은 후기 ID입니다.');
        }

        const result = await updateReviewStatusForOps(strapi, id, ctx.request.body);

        if ('error' in result) {
          return result.status === 404
            ? ctx.notFound(result.error)
            : ctx.badRequest(result.error);
        }

        ctx.body = { review: result.review };
      },
      config: { auth: false },
    },
    {
      method: 'PUT',
      path: '/api/user-reviews/internal/:id/home-featured',
      handler: async (ctx) => {
        if (!assertOpsInternalAccess(ctx)) {
          return;
        }

        const id = Number(ctx.params.id);
        if (!Number.isInteger(id) || id <= 0) {
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

        ctx.body = { review: result.review };
      },
      config: { auth: false },
    },
  ]);
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    registerNeisRoutes(strapi);
    registerOpsRoutes(strapi);
    await setupPermissions(strapi);
    await setupPasswordResetSettings(strapi);
    await setupBilling(strapi);
    await migrateLegacyDayOfWeek(strapi);
    await ensureNotificationIndexes(strapi);
    await fixLegacyUsersWithoutProvider(strapi);
  },
};
