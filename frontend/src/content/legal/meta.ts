export const LEGAL_VERSIONS = {
  terms: '1.0',
  privacy: '1.0',
} as const;

export const LEGAL_EFFECTIVE_DATES = {
  terms: '2026-06-19',
  privacy: '2026-06-19',
} as const;

/** 운영자 정보 — 실제 정보로 수정해 주세요. */
export const OPERATOR_INFO = {
  serviceName: 'Show Me The Plan',
  operatorName: 'Show Me The Plan 운영팀',
  contactEmail: 'contact@example.com',
  privacyOfficer: '개인정보 보호책임자',
  serviceUrl: 'https://rmaker.duckdns.org',
} as const;

export type LegalSection = {
  title: string;
  paragraphs: string[];
  list?: string[];
};
