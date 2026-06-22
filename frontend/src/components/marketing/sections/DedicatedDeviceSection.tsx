import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { DedicatedDeviceContent } from '@/content/marketing/types';

export default function DedicatedDeviceSection({
  title,
  headline,
  description,
}: DedicatedDeviceContent) {
  return (
    <MarketingSection title={title} variant="primary-tint">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mkt-card-gradient rounded-3xl p-8 sm:p-10">
          <p className="text-lg font-extrabold leading-snug sm:text-xl sm:leading-relaxed">
            {headline}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-mkt-text-on-accent sm:text-base sm:leading-7">
            {description}
          </p>
        </div>
      </div>
    </MarketingSection>
  );
}
