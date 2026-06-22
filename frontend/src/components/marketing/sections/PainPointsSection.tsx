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
    <MarketingSection title={title} eyebrow={eyebrow} variant="accent-tint">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 lg:gap-6">
        {items.map((item, index) => (
          <article
            key={item.title}
            className="mkt-card-elevated p-6 text-center sm:p-7"
          >
            <span className="mkt-icon-badge mx-auto text-sm font-bold">
              {index + 1}
            </span>
            <h3 className="mkt-h3 mt-4 text-base sm:text-lg">
              {item.title}
            </h3>
            {item.description ? (
              <p className="mkt-body mt-3 text-sm">{item.description}</p>
            ) : null}
          </article>
        ))}
      </div>
    </MarketingSection>
  );
}
