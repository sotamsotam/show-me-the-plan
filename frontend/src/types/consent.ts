import { LEGAL_VERSIONS } from '@/content/legal/meta';

export type SignupConsents = {
  termsAgreed: boolean;
  privacyAgreed: boolean;
  guardianConsentConfirmed: boolean;
  termsVersion: string;
  privacyVersion: string;
};

export const REQUIRED_CONSENT_VERSIONS = {
  terms: LEGAL_VERSIONS.terms,
  privacy: LEGAL_VERSIONS.privacy,
} as const;

export function createSignupConsentsPayload(
  termsAgreed: boolean,
  privacyAgreed: boolean,
  guardianConsentConfirmed: boolean
): SignupConsents {
  return {
    termsAgreed,
    privacyAgreed,
    guardianConsentConfirmed,
    termsVersion: REQUIRED_CONSENT_VERSIONS.terms,
    privacyVersion: REQUIRED_CONSENT_VERSIONS.privacy,
  };
}

export function validateSignupConsentsClient(consents: SignupConsents): string | null {
  if (!consents.termsAgreed) {
    return '이용약관에 동의해 주세요.';
  }
  if (!consents.privacyAgreed) {
    return '개인정보 수집·이용에 동의해 주세요.';
  }
  if (!consents.guardianConsentConfirmed) {
    return '만 14세 미만 가입 정책 확인에 동의해 주세요.';
  }
  if (consents.termsVersion !== REQUIRED_CONSENT_VERSIONS.terms) {
    return '이용약관 버전이 올바르지 않습니다. 페이지를 새로고침해 주세요.';
  }
  if (consents.privacyVersion !== REQUIRED_CONSENT_VERSIONS.privacy) {
    return '개인정보 처리방침 버전이 올바르지 않습니다. 페이지를 새로고침해 주세요.';
  }
  return null;
}
