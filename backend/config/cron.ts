export default {
  '0 3 * * *': async ({ strapi }) => {
    const { expireDueSubscriptions } = await import('../src/services/subscription');
    const expired = await expireDueSubscriptions(strapi);

    if (expired > 0) {
      strapi.log.info(`[cron] Marked ${expired} subscriptions as expired`);
    }
  },
  '* * * * *': async ({ strapi }) => {
    const { processDueNotifications } = await import('../src/services/notification-dispatch');
    const result = await processDueNotifications(strapi);

    if (result.processed > 0) {
      strapi.log.info(
        `[cron] Study notifications processed=${result.processed} pushed=${result.pushed} skipped=${result.skipped} deliveries=${result.pushDeliveries}`
      );
    }
  },
};
