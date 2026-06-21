import { describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_DELETION_STEPS,
  deleteUserAccount,
  deleteUserRelatedData,
  validateDeletionPasswordInput,
  verifyUserPassword,
} from './account-deletion';

type DeleteCall = {
  uid: string;
  method: 'findMany' | 'findOne' | 'delete';
  where?: unknown;
};

function createMockStrapi(options?: {
  userExists?: boolean;
  passwordValid?: boolean;
  deleteFails?: boolean;
  todoIds?: number[];
  scheduleIds?: number[];
  assignmentIds?: number[];
  paymentHistoryIds?: number[];
  subscriptionId?: number | null;
  profileId?: number | null;
}) {
  const {
    userExists = true,
    passwordValid = true,
    deleteFails = false,
    todoIds = [1],
    scheduleIds = [2],
    assignmentIds = [3],
    paymentHistoryIds = [11],
    subscriptionId = 10,
    profileId = 4,
  } = options ?? {};

  const deleteCalls: DeleteCall[] = [];

  const query = (uid: string) => ({
    findOne: vi.fn(async (params: { where: unknown }) => {
      deleteCalls.push({ uid, method: 'findOne', where: params.where });

      if (uid === 'plugin::users-permissions.user') {
        return userExists ? { id: 42, password: 'hashed-password' } : null;
      }

      if (uid === 'api::user-profile.user-profile' && profileId !== null) {
        return { id: profileId };
      }

      if (uid === 'api::subscription.subscription' && subscriptionId !== null) {
        return { id: subscriptionId };
      }

      return null;
    }),
    findMany: vi.fn(async (params: { where: unknown }) => {
      deleteCalls.push({ uid, method: 'findMany', where: params.where });

      if (uid === 'api::study-plan-todo.study-plan-todo') {
        return todoIds.map((id) => ({ id }));
      }

      if (uid === 'api::user-schedule.user-schedule') {
        return scheduleIds.map((id) => ({ id }));
      }

      if (uid === 'api::student-manager-assignment.student-manager-assignment') {
        const where = params.where as Record<string, unknown>;
        if ('student' in where) {
          return assignmentIds.map((id) => ({ id }));
        }
        if ('manager' in where) {
          return [];
        }
      }

      if (uid === 'api::payment-history.payment-history') {
        return paymentHistoryIds.map((id) => ({ id }));
      }

      return [];
    }),
    delete: vi.fn(async (params: { where: unknown }) => {
      if (deleteFails) {
        throw new Error('delete failed');
      }
      deleteCalls.push({ uid, method: 'delete', where: params.where });
    }),
  });

  const strapi = {
    log: { error: vi.fn() },
    db: { query },
    documents: vi.fn(() => ({
      delete: vi.fn(async ({ documentId }: { documentId: string }) => {
        if (deleteFails) {
          throw new Error('delete failed');
        }
        deleteCalls.push({
          uid: 'documents',
          method: 'delete',
          where: { documentId },
        });
      }),
    })),
    plugin: vi.fn(() => ({
      service: vi.fn(() => ({
        validatePassword: vi.fn(async () => passwordValid),
      })),
    })),
  };

  return { strapi, deleteCalls };
}

describe('validateDeletionPasswordInput', () => {
  it('rejects empty password', () => {
    expect(validateDeletionPasswordInput('')).toBe('비밀번호는 필수입니다.');
    expect(validateDeletionPasswordInput(undefined)).toBe('비밀번호는 필수입니다.');
  });

  it('accepts non-empty password', () => {
    expect(validateDeletionPasswordInput('secret')).toBeNull();
  });
});

describe('verifyUserPassword', () => {
  it('returns 404 when user does not exist', async () => {
    const { strapi } = createMockStrapi({ userExists: false });

    const result = await verifyUserPassword(strapi as never, 42, 'secret');

    expect(result).toEqual({
      ok: false,
      error: '사용자를 찾을 수 없습니다.',
      status: 404,
    });
  });

  it('returns 401 when password is invalid', async () => {
    const { strapi } = createMockStrapi({ passwordValid: false });

    const result = await verifyUserPassword(strapi as never, 42, 'wrong');

    expect(result).toEqual({
      ok: false,
      error: '비밀번호가 올바르지 않습니다.',
      status: 401,
    });
  });
});

describe('deleteUserRelatedData', () => {
  it('deletes owned records and profile before user', async () => {
    const { strapi, deleteCalls } = createMockStrapi();
    const userId = 42;

    await deleteUserRelatedData(strapi as never, userId);

    const deletedUids = deleteCalls
      .filter((call) => call.method === 'delete')
      .map((call) => call.uid);

    expect(deletedUids).toEqual([...ACCOUNT_DELETION_STEPS]);

    expect(deleteCalls).toContainEqual({
      uid: ACCOUNT_DELETION_STEPS[6],
      method: 'delete',
      where: { id: userId },
    });
  });

  it('queries assignments separately for student and manager roles', async () => {
    const { strapi, deleteCalls } = createMockStrapi();
    const userId = 42;

    await deleteUserRelatedData(strapi as never, userId);

    expect(deleteCalls).toContainEqual({
      uid: ACCOUNT_DELETION_STEPS[2],
      method: 'findMany',
      where: { student: userId },
    });
    expect(deleteCalls).toContainEqual({
      uid: ACCOUNT_DELETION_STEPS[2],
      method: 'findMany',
      where: { manager: userId },
    });
  });
});

describe('deleteUserAccount', () => {
  it('rejects missing password before deleting data', async () => {
    const { strapi, deleteCalls } = createMockStrapi();

    const result = await deleteUserAccount(strapi as never, 42, '');

    expect(result).toEqual({
      ok: false,
      error: '비밀번호는 필수입니다.',
      status: 400,
    });
    expect(deleteCalls.filter((call) => call.method === 'delete')).toHaveLength(0);
  });

  it('deletes related data when password is valid', async () => {
    const { strapi, deleteCalls } = createMockStrapi({ passwordValid: true });

    const result = await deleteUserAccount(strapi as never, 42, 'secret');

    expect(result).toEqual({ ok: true });
    expect(deleteCalls.some((call) => call.method === 'delete')).toBe(true);
  });

  it('returns 500 when deletion fails', async () => {
    const { strapi } = createMockStrapi({
      passwordValid: true,
      deleteFails: true,
    });

    const result = await deleteUserAccount(strapi as never, 42, 'secret');

    expect(result).toEqual({
      ok: false,
      error: '회원 탈퇴에 실패했습니다.',
      status: 500,
    });
  });
});
