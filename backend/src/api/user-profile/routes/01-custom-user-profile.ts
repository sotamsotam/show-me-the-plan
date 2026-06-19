export default {
  routes: [
    {
      method: 'POST',
      path: '/user-profiles/register',
      handler: 'user-profile.registerWithProfile',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/user-profiles/me',
      handler: 'user-profile.me',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/user-profiles/me',
      handler: 'user-profile.updateMe',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/user-profiles/me/withdraw',
      handler: 'user-profile.deleteMe',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/user-profiles/timetable',
      handler: 'user-profile.timetable',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/user-profiles/exam-countdown-context',
      handler: 'user-profile.examCountdownContext',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/user-profiles/exam-prep-settings',
      handler: 'user-profile.updateExamPrepSettings',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/user-profiles/exam-prep-weekly-plans',
      handler: 'user-profile.getExamPrepWeeklyPlans',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/user-profiles/exam-prep-weekly-plans',
      handler: 'user-profile.updateExamPrepWeeklyPlans',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/user-profiles/exam-prep-weekly-plan-templates',
      handler: 'user-profile.getExamPrepWeeklyPlanTemplates',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/user-profiles/exam-prep-weekly-plan-templates',
      handler: 'user-profile.createExamPrepWeeklyPlanTemplate',
      config: {
        auth: {},
      },
    },
    {
      method: 'DELETE',
      path: '/user-profiles/exam-prep-weekly-plan-templates/:templateId',
      handler: 'user-profile.deleteExamPrepWeeklyPlanTemplate',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/user-profiles/vacation-period-settings',
      handler: 'user-profile.getVacationPeriodSettings',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/user-profiles/vacation-period-settings',
      handler: 'user-profile.updateVacationPeriodSettings',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/user-profiles/vacation-weekly-plans',
      handler: 'user-profile.getVacationWeeklyPlans',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/user-profiles/vacation-weekly-plans',
      handler: 'user-profile.updateVacationWeeklyPlans',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/user-profiles/vacation-weekly-plan-templates',
      handler: 'user-profile.getVacationWeeklyPlanTemplates',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/user-profiles/vacation-weekly-plan-templates',
      handler: 'user-profile.createVacationWeeklyPlanTemplate',
      config: {
        auth: {},
      },
    },
    {
      method: 'DELETE',
      path: '/user-profiles/vacation-weekly-plan-templates/:templateId',
      handler: 'user-profile.deleteVacationWeeklyPlanTemplate',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/user-profiles/regular-weekly-plans',
      handler: 'user-profile.getRegularWeeklyPlans',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/user-profiles/regular-weekly-plans',
      handler: 'user-profile.updateRegularWeeklyPlans',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/user-profiles/regular-weekly-plan-templates',
      handler: 'user-profile.getRegularWeeklyPlanTemplates',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/user-profiles/regular-weekly-plan-templates',
      handler: 'user-profile.createRegularWeeklyPlanTemplate',
      config: {
        auth: {},
      },
    },
    {
      method: 'DELETE',
      path: '/user-profiles/regular-weekly-plan-templates/:templateId',
      handler: 'user-profile.deleteRegularWeeklyPlanTemplate',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/user-profiles/subjects',
      handler: 'user-profile.getSubjects',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/user-profiles/subjects',
      handler: 'user-profile.updateSubjects',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/user-profiles/managers/search',
      handler: 'user-profile.searchManagers',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/user-profiles/manager/students',
      handler: 'user-profile.listStudents',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/user-profiles/me/managers',
      handler: 'user-profile.listMyManagers',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/user-profiles/me/managers',
      handler: 'user-profile.addMyManager',
      config: {
        auth: {},
      },
    },
    {
      method: 'DELETE',
      path: '/user-profiles/me/managers/:managerUserId',
      handler: 'user-profile.removeMyManager',
      config: {
        auth: {},
      },
    },
  ],
};
