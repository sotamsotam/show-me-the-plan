export default {
  routes: [
    {
      method: 'POST',
      path: '/push-subscriptions/subscribe',
      handler: 'push-subscription.subscribe',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/push-subscriptions/unsubscribe',
      handler: 'push-subscription.unsubscribe',
      config: {
        auth: {},
      },
    },
  ],
};
