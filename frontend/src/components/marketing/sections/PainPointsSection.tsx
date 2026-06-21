import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { PainPoint } from '@/content/marketing/types';

export default function PainPointsSection({
  title,
  eyebrow,
  items,
}: {
  title: string;
  eyebrow?: string;
  items: PainPoint[];
}) {
  return (
    <MarketingSection title={title} eyebrow={eyebrow} variant="alt">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 lg:gap-6">
        {items.map((item, index) => (
          <article
            key={item.title}
            className="mkt-card-shadow-sm rounded-3xl bg-white p-6 text-center ring-1 ring-gray-100 sm:p-7"
          >
            <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {index + 1}
            </span>
            <h3 className="mt-4 text-base font-bold leading-snug text-gray-900 sm:text-lg">
              {item.title}
            </h3>
            {item.description ? (
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.description}</p>
            ) : null}
          </article>
        ))}
      </div>
    </MarketingSection>
  );
}
