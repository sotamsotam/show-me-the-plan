import type { Metadata } from 'next';
import LegalDocument from '@/components/LegalDocument';
import { LEGAL_EFFECTIVE_DATES, LEGAL_VERSIONS } from '@/content/legal/meta';
import { TERMS_SECTIONS } from '@/content/legal/terms-v1';

export const metadata: Metadata = {
  title: '이용약관 | Show Me The Plan',
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="이용약관"
      version={LEGAL_VERSIONS.terms}
      effectiveDate={LEGAL_EFFECTIVE_DATES.terms}
      sections={TERMS_SECTIONS}
    />
  );
}
