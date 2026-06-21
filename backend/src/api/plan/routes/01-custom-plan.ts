export default {
  routes: [
    {
      method: 'GET',
      path: '/plans/active',
      handler: 'plan.listActive',
      config: {
        auth: false,
      },
    },
  ],
};
