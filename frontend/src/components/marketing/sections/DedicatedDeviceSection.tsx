import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { DedicatedDeviceContent } from '@/content/marketing/types';

export default function DedicatedDeviceSection({
  title,
  headline,
  description,
}: DedicatedDeviceContent) {
  return (
    <MarketingSection title={title} variant="default">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mkt-card-shadow-sm rounded-3xl bg-[#f0f6ff] p-8 ring-1 ring-blue-100 sm:p-10">
          <p className="text-lg font-extrabold leading-snug text-gray-900 sm:text-xl sm:leading-relaxed">
            {headline}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-gray-700 sm:text-base sm:leading-7">
            {description}
          </p>
        </div>
      </div>
    </MarketingSection>
  );
}
