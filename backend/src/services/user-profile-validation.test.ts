import { describe, expect, it } from 'vitest';
import { validateSignupProfile } from './user-profile-validation';

const neisProfile = {
  schoolLevel: 'high',
  atptOfcdcScCode: 'B10',
  sdSchulCode: '7010567',
  schoolName: '테스트고',
  grade: '2',
  className: '3',
};

describe('validateSignupProfile', () => {
  it('accepts other student without school fields', () => {
    expect(validateSignupProfile({ schoolLevel: 'other' })).toBeNull();
  });

  it('accepts manager without school fields', () => {
    expect(validateSignupProfile({ schoolLevel: 'manager' })).toBeNull();
  });

  it('requires school fields for NEIS students', () => {
    expect(validateSignupProfile({ schoolLevel: 'high' })).toBe(
      'atptOfcdcScCode는 필수입니다.'
    );
    expect(validateSignupProfile(neisProfile)).toBeNull();
  });

  it('rejects unsupported school levels', () => {
    expect(validateSignupProfile({ schoolLevel: 'college' })).toBe(
      '초등학교, 중학교, 고등학교, 기타학생, 매니저만 지원합니다.'
    );
  });

  it('rejects missing profile object', () => {
    expect(validateSignupProfile(null as unknown as Record<string, unknown>)).toBe(
      '프로필 정보가 필요합니다.'
    );
  });
});
