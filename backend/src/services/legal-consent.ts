export const LEGAL_VERSIONS = {
  terms: '1.0',
  privacy: '1.0',
  paidService: '1.0',
} as const;

export type SignupConsentsInput = {
  termsAgreed?: boolean;
  privacyAgreed?: boolean;
  guardianConsentConfirmed?: boolean;
  termsVersion?: string;
  privacyVersion?: string;
};

export type PaidServiceConsentInput = {
  paidServiceAgreed?: boolean;
  paidServiceVersion?: string;
};

export function validateSignupConsents(consents: SignupConsentsInput | undefined): string | null {
  if (!consents || typeof consents !== 'object') {
    return '가입 동의 정보가 필요합니다.';
  }

  if (!consents.termsAgreed) {
    return '이용약관에 동의해 주세요.';
  }

  if (!consents.privacyAgreed) {
    return '개인정보 수집·이용에 동의해 주세요.';
  }

  if (!consents.guardianConsentConfirmed) {
    return '만 14세 미만 가입 정책 확인에 동의해 주세요.';
  }

  if (consents.termsVersion !== LEGAL_VERSIONS.terms) {
    return '이용약관 버전이 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해 주세요.';
  }

  if (consents.privacyVersion !== LEGAL_VERSIONS.privacy) {
    return '개인정보 처리방침 버전이 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해 주세요.';
  }

  return null;
}

export function buildConsentProfileFields(consents: SignupConsentsInput) {
  const agreedAt = new Date().toISOString();

  return {
    termsAgreedAt: agreedAt,
    termsVersion: consents.termsVersion!,
    privacyAgreedAt: agreedAt,
    privacyVersion: consents.privacyVersion!,
    guardianConsentConfirmedAt: agreedAt,
  };
}

export function validatePaidServiceConsent(
  consent: PaidServiceConsentInput | undefined
): string | null {
  if (!consent || typeof consent !== 'object') {
    return '유료서비스 이용약관 동의 정보가 필요합니다.';
  }

  if (!consent.paidServiceAgreed) {
    return '유료서비스 이용약관에 동의해 주세요.';
  }

  if (consent.paidServiceVersion !== LEGAL_VERSIONS.paidService) {
    return '유료서비스 이용약관 버전이 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해 주세요.';
  }

  return null;
}

export function buildPaidServiceConsentFields(version: string) {
  return {
    paidServiceAgreedAt: new Date().toISOString(),
    paidServiceVersion: version,
  };
}
