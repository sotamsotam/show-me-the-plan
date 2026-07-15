import { describe, expect, it } from 'vitest';
import {
  buildConsentProfileFields,
  buildPaidServiceConsentFields,
  validatePaidServiceConsent,
  validateSignupConsents,
} from './legal-consent';

describe('validateSignupConsents', () => {
  const validConsents = {
    termsAgreed: true,
    privacyAgreed: true,
    guardianConsentConfirmed: true,
    termsVersion: '1.0',
    privacyVersion: '1.0',
  };

  it('accepts valid consents', () => {
    expect(validateSignupConsents(validConsents)).toBeNull();
  });

  it('rejects missing consents object', () => {
    expect(validateSignupConsents(undefined)).toBe('가입 동의 정보가 필요합니다.');
  });

  it('rejects when terms not agreed', () => {
    expect(
      validateSignupConsents({ ...validConsents, termsAgreed: false })
    ).toBe('이용약관에 동의해 주세요.');
  });

  it('rejects outdated terms version', () => {
    expect(
      validateSignupConsents({ ...validConsents, termsVersion: '0.9' })
    ).toContain('이용약관 버전');
  });
});

describe('buildConsentProfileFields', () => {
  it('returns consent timestamps and versions', () => {
    const fields = buildConsentProfileFields({
      termsAgreed: true,
      privacyAgreed: true,
      guardianConsentConfirmed: true,
      termsVersion: '1.0',
      privacyVersion: '1.0',
    });

    expect(fields.termsVersion).toBe('1.0');
    expect(fields.privacyVersion).toBe('1.0');
    expect(fields.termsAgreedAt).toBeTruthy();
    expect(fields.privacyAgreedAt).toBeTruthy();
    expect(fields.guardianConsentConfirmedAt).toBeTruthy();
  });
});

describe('validatePaidServiceConsent', () => {
  it('accepts valid paid service consent', () => {
    expect(
      validatePaidServiceConsent({
        paidServiceAgreed: true,
        paidServiceVersion: '1.0',
      })
    ).toBeNull();
  });

  it('rejects when not agreed', () => {
    expect(
      validatePaidServiceConsent({
        paidServiceAgreed: false,
        paidServiceVersion: '1.0',
      })
    ).toBe('유료서비스 이용약관에 동의해 주세요.');
  });
});

describe('buildPaidServiceConsentFields', () => {
  it('returns paid service consent timestamps and version', () => {
    const fields = buildPaidServiceConsentFields('1.0');

    expect(fields.paidServiceVersion).toBe('1.0');
    expect(fields.paidServiceAgreedAt).toBeTruthy();
  });
});
