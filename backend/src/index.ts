import type { Core } from '@strapi/strapi';
import { getClassInfo, searchSchools } from './services/neis';

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
    'api::study-plan-todo.study-plan-todo.updateExecution'
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
    'api::study-plan-todo.study-plan-todo.findInRange',
    'api::study-plan-todo.study-plan-todo.findTitles',
    'api::study-plan-todo.study-plan-todo.create',
    'api::study-plan-todo.study-plan-todo.update',
    'api::study-plan-todo.study-plan-todo.remove',
    'api::study-plan-todo.study-plan-todo.updateOccurrence',
    'api::study-plan-todo.study-plan-todo.excludeOccurrence',
    'api::study-plan-todo.study-plan-todo.updateExecution',
  ];

  for (const action of managerActions) {
    await ensureRolePermission(strapi, 'manager', action);
  }
}

async function fixLegacyUsersWithoutProvider(strapi: Core.Strapi) {
  await strapi.db.connection('up_users').whereNull('provider').update({ provider: 'local' });
  await strapi.db.connection('up_users').where('provider', '').update({ provider: 'local' });
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

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    registerNeisRoutes(strapi);
    await setupPermissions(strapi);
    await setupPasswordResetSettings(strapi);
    await migrateLegacyDayOfWeek(strapi);
    await fixLegacyUsersWithoutProvider(strapi);
  },
};
