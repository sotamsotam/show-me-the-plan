import type { Core } from '@strapi/strapi';

const USER_PROFILE_UID = 'api::user-profile.user-profile';

export async function isOperatorUser(
  strapi: Core.Strapi,
  userId: number
): Promise<boolean> {
  const profile = (await strapi.db.query(USER_PROFILE_UID).findOne({
    where: { user: userId },
  })) as { isOperator?: boolean | null } | null;

  return profile?.isOperator === true;
}
