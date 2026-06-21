import type { Core } from '@strapi/strapi';
import { isActiveAssignment } from './student-manager-assignment';
import { hasActiveSubscription } from './subscription';

const PROFILE_UID = 'api::user-profile.user-profile' as const;

export async function isApprovedManager(
  strapi: Core.Strapi,
  userId: number
): Promise<boolean> {
  const profile = (await strapi.db.query(PROFILE_UID).findOne({
    where: {
      user: userId,
      schoolLevel: 'manager',
      managerStatus: 'approved',
    },
  })) as { id: number } | null;

  return Boolean(profile);
}

export async function isManagerOfStudent(
  strapi: Core.Strapi,
  managerUserId: number,
  studentUserId: number
): Promise<boolean> {
  return isActiveAssignment(strapi, studentUserId, managerUserId);
}

export function parseStudentUserId(
  raw: string | number | undefined | null
): number | null {
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }

  const id = typeof raw === 'number' ? raw : Number(raw);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

export async function resolveTargetUserId(
  strapi: Core.Strapi,
  currentUserId: number,
  studentUserIdRaw: string | number | undefined | null
): Promise<{ userId: number } | { error: string; status: 403 }> {
  const studentUserId = parseStudentUserId(studentUserIdRaw);

  if (studentUserId === null) {
    return { userId: currentUserId };
  }

  if (studentUserId === currentUserId) {
    return { userId: currentUserId };
  }

  const isManager = await isApprovedManager(strapi, currentUserId);

  if (!isManager) {
    return { error: '다른 사용자의 데이터에 접근할 수 없습니다.', status: 403 };
  }

  const assigned = await isManagerOfStudent(strapi, currentUserId, studentUserId);

  if (!assigned) {
    return { error: '담당 학생이 아닙니다.', status: 403 };
  }

  const studentSubscribed = await hasActiveSubscription(strapi, studentUserId);

  if (!studentSubscribed) {
    return {
      error: '학생의 구독이 만료되어 관리할 수 없습니다.',
      status: 403,
    };
  }

  return { userId: studentUserId };
}

type KoaContext = {
  state: { user?: { id: number } };
  query: Record<string, unknown>;
  request: { body?: Record<string, unknown> };
};

export async function resolveOwnerFromContext(
  strapi: Core.Strapi,
  ctx: KoaContext
): Promise<{ userId: number } | { error: string; status: 401 | 403 }> {
  const user = ctx.state.user;

  if (!user) {
    return { error: '로그인이 필요합니다.', status: 401 };
  }

  const queryId = ctx.query.studentUserId as string | undefined;
  const bodyId = ctx.request.body?.studentUserId as string | number | undefined;
  const raw = queryId ?? bodyId;

  const resolved = await resolveTargetUserId(strapi, user.id, raw);

  if ('error' in resolved) {
    return { error: resolved.error, status: resolved.status };
  }

  return { userId: resolved.userId };
}
