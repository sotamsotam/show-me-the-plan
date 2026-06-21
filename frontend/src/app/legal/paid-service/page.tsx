import type { Metadata } from 'next';
import LegalDocument from '@/components/LegalDocument';
import { LEGAL_EFFECTIVE_DATES, LEGAL_VERSIONS } from '@/content/legal/meta';
import { PAID_SERVICE_SECTIONS } from '@/content/legal/paid-service-v1';

export const metadata: Metadata = {
  title: '유료서비스 이용약관 | Show Me The Plan',
};

export default function PaidServiceTermsPage() {
  return (
    <LegalDocument
      title="유료서비스 이용약관"
      version={LEGAL_VERSIONS.paidService}
      effectiveDate={LEGAL_EFFECTIVE_DATES.paidService}
      sections={PAID_SERVICE_SECTIONS}
    />
  );
}
