export default {
  '0 3 * * *': async ({ strapi }) => {
    const { expireDueSubscriptions } = await import('../src/services/subscription');
    const expired = await expireDueSubscriptions(strapi);

    if (expired > 0) {
      strapi.log.info(`[cron] Marked ${expired} subscriptions as expired`);
    }
  },
};
