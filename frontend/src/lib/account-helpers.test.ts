import { describe, expect, it } from 'vitest';
import {
  APP_ENTRY_PATH,
  getDefaultDashboardPath,
  getDefaultDashboardPathFromAccount,
  getDefaultDashboardPathFromSession,
  getMarketingAppEntryFromSession,
  getMarketingHomeUrl,
  isMarketingHomeBypass,
  isSafeInternalCallbackPath,
  resolvePostLoginPath,
} from './account-helpers';
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

describe('getDefaultDashboardPathFromSession', () => {
  it('routes operators to ops', () => {
    expect(getDefaultDashboardPathFromSession({ isOperator: true })).toBe('/ops');
  });

  it('routes pending managers to pending dashboard', () => {
    expect(
      getDefaultDashboardPathFromSession({
        schoolLevel: 'manager',
        managerStatus: 'pending',
      })
    ).toBe('/dashboard/pending');
  });

  it('routes approved managers to overview dashboard', () => {
    expect(
      getDefaultDashboardPathFromSession({
        schoolLevel: 'manager',
        managerStatus: 'approved',
      })
    ).toBe('/dashboard');
  });

  it('routes students to todo dashboard', () => {
    expect(getDefaultDashboardPathFromSession({ schoolLevel: 'high' })).toBe('/dashboard/todo');
  });
});

describe('getMarketingAppEntryFromSession', () => {
  it('returns operator entry', () => {
    expect(getMarketingAppEntryFromSession({ isOperator: true })).toEqual({
      label: '운영 콘솔',
      href: '/ops',
    });
  });

  it('returns student entry', () => {
    expect(getMarketingAppEntryFromSession({ schoolLevel: 'middle' })).toEqual({
      label: '오늘의 스터디플랜',
      href: '/dashboard/todo',
    });
  });
});

describe('isMarketingHomeBypass', () => {
  it('detects marketing bypass query', () => {
    expect(isMarketingHomeBypass({ view: 'marketing' })).toBe(true);
    expect(isMarketingHomeBypass({ view: ['marketing'] })).toBe(true);
    expect(isMarketingHomeBypass({ view: 'home' })).toBe(false);
    expect(isMarketingHomeBypass({})).toBe(false);
  });
});

describe('getMarketingHomeUrl', () => {
  it('returns bypass url', () => {
    expect(getMarketingHomeUrl()).toBe('/?view=marketing');
  });
});

describe('getDefaultDashboardPathFromAccount', () => {
  it('routes operators to ops', () => {
    expect(
      getDefaultDashboardPathFromAccount({
        role: { id: 1, name: 'Authenticated', type: 'authenticated' },
        profile: { schoolLevel: 'high', isOperator: true },
      })
    ).toBe('/ops');
  });

  it('routes pending managers to pending dashboard', () => {
    expect(
      getDefaultDashboardPathFromAccount({
        role: { id: 1, name: 'Authenticated', type: 'authenticated' },
        profile: { schoolLevel: 'manager', managerStatus: 'pending' },
      })
    ).toBe('/dashboard/pending');
  });
});

describe('isSafeInternalCallbackPath', () => {
  it('accepts internal app paths', () => {
    expect(isSafeInternalCallbackPath('/dashboard/todo')).toBe(true);
    expect(isSafeInternalCallbackPath('/ops')).toBe(true);
  });

  it('rejects external and login paths', () => {
    expect(isSafeInternalCallbackPath('https://evil.com')).toBe(false);
    expect(isSafeInternalCallbackPath('//evil.com')).toBe(false);
    expect(isSafeInternalCallbackPath('/login')).toBe(false);
    expect(isSafeInternalCallbackPath(null)).toBe(false);
  });
});

describe('resolvePostLoginPath', () => {
  it('uses safe callback url when provided', () => {
    expect(
      resolvePostLoginPath({ schoolLevel: 'high' }, '/dashboard/schedule')
    ).toBe('/dashboard/schedule');
  });

  it('falls back to role-based home', () => {
    expect(resolvePostLoginPath({ schoolLevel: 'high' }, '/login')).toBe(
      '/dashboard/todo'
    );
  });
});

describe('APP_ENTRY_PATH', () => {
  it('is /app', () => {
    expect(APP_ENTRY_PATH).toBe('/app');
  });
});
