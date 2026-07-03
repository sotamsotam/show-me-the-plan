import ProcessStepList from '@/components/marketing/ProcessStepList';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { ProcessStep } from '@/content/marketing/types';

export default function ProcessSection({
  title,
  eyebrow = '이용 방법',
  description,
  steps,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  steps: ProcessStep[];
}) {
  return (
    <MarketingSection title={title} eyebrow={eyebrow} description={description} variant="primary-tint">
      <ProcessStepList steps={steps} />
    </MarketingSection>
  );
}
