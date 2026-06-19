export default {
  routes: [
    {
      method: 'GET',
      path: '/study-plan-todos/titles',
      handler: 'study-plan-todo.findTitles',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/study-plan-todos',
      handler: 'study-plan-todo.findInRange',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/study-plan-todos',
      handler: 'study-plan-todo.create',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/study-plan-todos/:id',
      handler: 'study-plan-todo.update',
      config: {
        auth: {},
      },
    },
    {
      method: 'DELETE',
      path: '/study-plan-todos/:id',
      handler: 'study-plan-todo.remove',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/study-plan-todos/:id/occurrences/:date',
      handler: 'study-plan-todo.updateOccurrence',
      config: {
        auth: {},
      },
    },
    {
      method: 'DELETE',
      path: '/study-plan-todos/:id/occurrences/:date',
      handler: 'study-plan-todo.excludeOccurrence',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/study-plan-todos/:id/executions/:date',
      handler: 'study-plan-todo.updateExecution',
      config: {
        auth: {},
      },
    },
  ],
};
