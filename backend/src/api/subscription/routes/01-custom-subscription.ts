export default {
  routes: [
    {
      method: 'GET',
      path: '/subscriptions/me',
      handler: 'subscription.me',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/subscriptions/payment-history',
      handler: 'subscription.paymentHistory',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/subscriptions/cancel',
      handler: 'subscription.cancel',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/subscriptions/internal/payment-succeeded',
      handler: 'subscription.internalPaymentSucceeded',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/subscriptions/internal/payment-failed',
      handler: 'subscription.internalPaymentFailed',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/subscriptions/internal/save-billing-key',
      handler: 'subscription.internalSaveBillingKey',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/subscriptions/internal/grant-free-period',
      handler: 'subscription.internalGrantFreePeriod',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/subscriptions/internal/renewal-candidates',
      handler: 'subscription.internalRenewalCandidates',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/subscriptions/internal/expire-for-qa',
      handler: 'subscription.internalExpireForQa',
      config: {
        auth: false,
      },
    },
  ],
};
