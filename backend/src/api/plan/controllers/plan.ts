import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::plan.plan', ({ strapi }) => ({
  async listActive(ctx) {
    const plans = await strapi.db.query('api::plan.plan').findMany({
      where: { active: true },
      orderBy: { price: 'asc' },
    });

    return ctx.send({
      plans: plans.map((plan) => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        price: plan.price,
        interval: plan.interval,
        targetSchoolLevels: plan.targetSchoolLevels,
      })),
    });
  },
}));
