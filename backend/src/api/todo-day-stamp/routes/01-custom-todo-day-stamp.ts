export default {
  routes: [
    {
      method: 'GET',
      path: '/todo-day-stamps',
      handler: 'todo-day-stamp.findInRange',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/todo-day-stamps/:date',
      handler: 'todo-day-stamp.upsertForDate',
      config: {
        auth: {},
      },
    },
  ],
};
