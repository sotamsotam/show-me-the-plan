import { describe, expect, it } from 'vitest';
import { getDefaultDashboardPath } from './account-helpers';
import type { AccountInfo } from '@/types/school';

function accountWithSchoolLevel(schoolLevel: AccountInfo['profile'] extends infer P
  ? P extends { schoolLevel: infer L }
    ? L
    : never
  : never): AccountInfo {
  return {
    role: { id: 1, name: 'Authenticated', type: 'authenticated' },
    profile: { schoolLevel },
  };
}

describe('getDefaultDashboardPath', () => {
  it('routes other students to todo dashboard', () => {
    expect(getDefaultDashboardPath(accountWithSchoolLevel('other'))).toBe('/dashboard/todo');
  });

  it('routes NEIS students to todo dashboard', () => {
    expect(getDefaultDashboardPath(accountWithSchoolLevel('high'))).toBe('/dashboard/todo');
  });
});
