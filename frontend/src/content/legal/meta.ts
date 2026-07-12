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

/** 운영자 정보 — 문의·사업자 정보는 환경 변수로 설정할 수 있습니다. */
export const OPERATOR_INFO = {
  serviceName: 'SHOW ME THE PLAN',
  serviceNameKo: '쇼미플',
  serviceDescription:
    '초·중·고 학생과 학부모(매니저)를 위한 분량 중심 학습 계획·실행 관리 서비스입니다.',
  operatorName: 'SHOW ME THE PLAN 운영팀',
  contactEmail:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || 'support@showmepl.com',
  privacyOfficer: '개인정보 보호책임자',
  serviceUrl: 'https://www.showmepl.com',
  representativeName: process.env.NEXT_PUBLIC_REPRESENTATIVE_NAME?.trim() || '',
  businessRegistrationNumber:
    process.env.NEXT_PUBLIC_BUSINESS_REG_NO?.trim() || '',
  businessAddress: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS?.trim() || '',
} as const;

export type LegalSection = {
  title: string;
  paragraphs: string[];
  list?: string[];
};
