import type { Core } from '@strapi/strapi';

const STUDY_PLAN_TODO_UID = 'api::study-plan-todo.study-plan-todo' as const;
const USER_SCHEDULE_UID = 'api::user-schedule.user-schedule' as const;
const ASSIGNMENT_UID =
  'api::student-manager-assignment.student-manager-assignment' as const;
const PROFILE_UID = 'api::user-profile.user-profile' as const;
const USER_UID = 'plugin::users-permissions.user' as const;

type ApiContentUid =
  | typeof STUDY_PLAN_TODO_UID
  | typeof USER_SCHEDULE_UID
  | typeof ASSIGNMENT_UID
  | typeof PROFILE_UID;

/** 연쇄 삭제 순서 — 테스트에서 호출 순서 검증용 */
export const ACCOUNT_DELETION_STEPS = [
  STUDY_PLAN_TODO_UID,
  USER_SCHEDULE_UID,
  ASSIGNMENT_UID,
  PROFILE_UID,
  USER_UID,
] as const;

export type AccountDeletionSuccess = { ok: true };

export type AccountDeletionFailure = {
  ok: false;
  error: string;
  status: 400 | 401 | 404 | 500;
};

export type AccountDeletionResult = AccountDeletionSuccess | AccountDeletionFailure;

export function validateDeletionPasswordInput(password: unknown): string | null {
  if (typeof password !== 'string' || password.length === 0) {
    return '비밀번호는 필수입니다.';
  }

  return null;
}

export async function verifyUserPassword(
  strapi: Core.Strapi,
  userId: number,
  password: string
): Promise<AccountDeletionSuccess | AccountDeletionFailure> {
  const user = await strapi.db.query(USER_UID).findOne({
    where: { id: userId },
  });

  if (!user) {
    return { ok: false, error: '사용자를 찾을 수 없습니다.', status: 404 };
  }

  const userService = strapi.plugin('users-permissions').service('user');
  const valid = await userService.validatePassword(password, user.password);

  if (!valid) {
    return { ok: false, error: '비밀번호가 올바르지 않습니다.', status: 401 };
  }

  return { ok: true };
}

async function deleteApiRecord(
  strapi: Core.Strapi,
  uid: ApiContentUid,
  row: { id: number; documentId?: string }
): Promise<void> {
  if (row.documentId) {
    await strapi.documents(uid).delete({ documentId: row.documentId });
    return;
  }

  await strapi.db.query(uid).delete({ where: { id: row.id } });
}

async function deleteApiRecords(
  strapi: Core.Strapi,
  uid: ApiContentUid,
  rows: Array<{ id: number; documentId?: string }>
): Promise<void> {
  for (const row of rows) {
    await deleteApiRecord(strapi, uid, row);
  }
}

async function deleteOwnedRecords(
  strapi: Core.Strapi,
  uid: typeof STUDY_PLAN_TODO_UID | typeof USER_SCHEDULE_UID,
  userId: number
): Promise<void> {
  const rows = (await strapi.db.query(uid).findMany({
    where: { user: userId },
  })) as Array<{ id: number; documentId?: string }>;

  await deleteApiRecords(strapi, uid, rows);
}

async function deleteManagerAssignments(
  strapi: Core.Strapi,
  userId: number
): Promise<void> {
  const asStudent = (await strapi.db.query(ASSIGNMENT_UID).findMany({
    where: { student: userId },
  })) as Array<{ id: number; documentId?: string }>;

  const asManager = (await strapi.db.query(ASSIGNMENT_UID).findMany({
    where: { manager: userId },
  })) as Array<{ id: number; documentId?: string }>;

  const uniqueAssignments = new Map<number, { id: number; documentId?: string }>();
  for (const row of [...asStudent, ...asManager]) {
    uniqueAssignments.set(row.id, row);
  }

  await deleteApiRecords(strapi, ASSIGNMENT_UID, [...uniqueAssignments.values()]);
}

export async function deleteUserRelatedData(
  strapi: Core.Strapi,
  userId: number
): Promise<void> {
  await deleteOwnedRecords(strapi, STUDY_PLAN_TODO_UID, userId);
  await deleteOwnedRecords(strapi, USER_SCHEDULE_UID, userId);
  await deleteManagerAssignments(strapi, userId);

  const profile = (await strapi.db.query(PROFILE_UID).findOne({
    where: { user: userId },
  })) as { id: number; documentId?: string } | null;

  if (profile) {
    await deleteApiRecord(strapi, PROFILE_UID, profile);
  }

  await strapi.db.query(USER_UID).delete({ where: { id: userId } });
}

export async function deleteUserAccount(
  strapi: Core.Strapi,
  userId: number,
  password: unknown
): Promise<AccountDeletionResult> {
  const passwordError = validateDeletionPasswordInput(password);
  if (passwordError) {
    return { ok: false, error: passwordError, status: 400 };
  }

  const verification = await verifyUserPassword(
    strapi,
    userId,
    password as string
  );
  if (verification.ok === false) {
    return verification;
  }

  try {
    await deleteUserRelatedData(strapi, userId);
    return { ok: true };
  } catch (error) {
    strapi.log.error('Account deletion failed', error);
    return { ok: false, error: '회원 탈퇴에 실패했습니다.', status: 500 };
  }
}
