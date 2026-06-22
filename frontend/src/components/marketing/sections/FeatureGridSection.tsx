import { FEATURE_ICONS, MarketingIcon } from '@/components/marketing/MarketingIcons';
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
    <MarketingSection title={title} eyebrow={eyebrow} variant="default">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {items.map((item, index) => (
          <article
            key={item.title}
            className={`flex gap-4 p-6 ${index % 2 === 0 ? 'mkt-card-accent' : 'mkt-card-primary'}`}
          >
            <span className="mkt-icon-badge shrink-0">
              <MarketingIcon
                name={FEATURE_ICONS[index % FEATURE_ICONS.length]}
                className="h-5 w-5"
              />
            </span>
            <div className="min-w-0">
              <h3 className="mkt-h3">{item.title}</h3>
              <p className="mkt-body mt-2 text-sm">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </MarketingSection>
  );
}
