import type { Core } from '@strapi/strapi';

async function promoteUserToManager(strapi: Core.Strapi, userId: number) {
  const managerRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'manager' } });

  if (!managerRole) {
    return;
  }

  await strapi.db.query('plugin::users-permissions.user').update({
    where: { id: userId },
    data: { role: managerRole.id },
  });
}

async function demoteManagerToAuthenticated(strapi: Core.Strapi, userId: number) {
  const authenticatedRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } });

  if (!authenticatedRole) {
    return;
  }

  await strapi.db.query('plugin::users-permissions.user').update({
    where: { id: userId },
    data: { role: authenticatedRole.id },
  });
}

async function syncManagerRoleForProfile(strapi: Core.Strapi, profileId: number) {
  const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
    where: { id: profileId },
    populate: ['user'],
  });

  const userId = profile?.user?.id;

  if (!userId || profile?.schoolLevel !== 'manager') {
    return;
  }

  if (profile.managerStatus === 'approved') {
    await promoteUserToManager(strapi, userId);
    return;
  }

  await demoteManagerToAuthenticated(strapi, userId);
}

export default {
  async afterCreate(event) {
    await syncManagerRoleForProfile(strapi, event.result.id);
  },

  async afterUpdate(event) {
    await syncManagerRoleForProfile(strapi, event.result.id);
  },
};
