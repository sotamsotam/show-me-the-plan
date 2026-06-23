export default {
  routes: [
    {
      method: 'GET',
      path: '/user-schedules',
      handler: 'user-schedule.findInRange',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/user-schedules/attachments/upload',
      handler: 'user-schedule.uploadAttachment',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/user-schedules',
      handler: 'user-schedule.create',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/user-schedules/:id',
      handler: 'user-schedule.update',
      config: {
        auth: {},
      },
    },
    {
      method: 'DELETE',
      path: '/user-schedules/:id',
      handler: 'user-schedule.remove',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/user-schedules/:id/occurrences/:date',
      handler: 'user-schedule.updateOccurrence',
      config: {
        auth: {},
      },
    },
    {
      method: 'DELETE',
      path: '/user-schedules/:id/occurrences/:date',
      handler: 'user-schedule.excludeOccurrence',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/user-schedules/:id/occurrences/:date/move',
      handler: 'user-schedule.moveOccurrence',
      config: {
        auth: {},
      },
    },
  ],
};
