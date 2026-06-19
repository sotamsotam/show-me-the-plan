import type { Metadata } from 'next';
import LegalDocument from '@/components/LegalDocument';
import { LEGAL_EFFECTIVE_DATES, LEGAL_VERSIONS } from '@/content/legal/meta';
import { PRIVACY_SECTIONS } from '@/content/legal/privacy-v1';

export const metadata: Metadata = {
  title: '개인정보 처리방침 | Show Me The Plan',
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="개인정보 처리방침"
      version={LEGAL_VERSIONS.privacy}
      effectiveDate={LEGAL_EFFECTIVE_DATES.privacy}
      sections={PRIVACY_SECTIONS}
    />
  );
}
