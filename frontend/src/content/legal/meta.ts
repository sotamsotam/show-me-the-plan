export const LEGAL_VERSIONS = {
  terms: '1.0',
  privacy: '1.0',
  paidService: '1.0',
} as const;

export const LEGAL_EFFECTIVE_DATES = {
  terms: '2026-06-19',
  privacy: '2026-06-19',
  paidService: '2026-06-20',
} as const;

/** 운영자 정보 — 실제 값은 환경 변수로 덮어쓸 수 있습니다. (미설정 시 샘플 값) */
export const OPERATOR_INFO = {
  serviceName: 'SHOW ME THE PLAN',
  serviceNameKo: '쇼미플',
  serviceDescription:
    '초·중·고 학생과 학부모(매니저)를 위한 분량 중심 학습 계획·실행 관리 서비스입니다.',
  operatorName:
    process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || '주식회사 쇼미플',
  contactEmail:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || 'support@showmepl.com',
  contactPhone:
    process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || '02-1234-5678',
  privacyOfficerName:
    process.env.NEXT_PUBLIC_PRIVACY_OFFICER_NAME?.trim() || '김개인',
  privacyOfficerTitle:
    process.env.NEXT_PUBLIC_PRIVACY_OFFICER_TITLE?.trim() || '대표',
  serviceUrl: 'https://www.showmepl.com',
  representativeName:
    process.env.NEXT_PUBLIC_REPRESENTATIVE_NAME?.trim() || '홍길동',
  businessRegistrationNumber:
    process.env.NEXT_PUBLIC_BUSINESS_REG_NO?.trim() || '123-45-67890',
  ecommerceRegistrationNumber:
    process.env.NEXT_PUBLIC_ECOMMERCE_REG_NO?.trim() ||
    '제2026-서울강남-00000호',
  businessAddress:
    process.env.NEXT_PUBLIC_BUSINESS_ADDRESS?.trim() ||
    '서울특별시 강남구 테헤란로 123, 4층',
} as const;

export type LegalSection = {
  title: string;
  paragraphs: string[];
  list?: string[];
};
