import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { FeatureItem } from '@/content/marketing/types';

export default function FeatureGridSection({
  title,
  eyebrow = '핵심 기능',
  items,
}: {
  title: string;
  eyebrow?: string;
  items: FeatureItem[];
}) {
  return (
    <MarketingSection title={title} eyebrow={eyebrow} variant="warm">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {items.map((item, index) => (
          <article
            key={item.title}
            className="mkt-card-shadow-sm flex gap-4 rounded-3xl bg-white p-6 ring-1 ring-gray-100"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-sm font-extrabold text-white">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <h3 className="font-bold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </MarketingSection>
  );
}
