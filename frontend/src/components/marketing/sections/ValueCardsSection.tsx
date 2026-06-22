import { MarketingIcon, VALUE_ICONS } from '@/components/marketing/MarketingIcons';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { ValueCard } from '@/content/marketing/types';

export default function ValueCardsSection({
  title,
  eyebrow = 'Show Me The Plan이 지향하는 공부',
  items,
}: {
  title: string;
  eyebrow?: string;
  items: ValueCard[];
}) {
  return (
    <MarketingSection title={title} eyebrow={eyebrow} variant="accent-tint">
      <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
        {items.map((item, index) => (
          <article
            key={item.title}
            className="mkt-card-elevated group relative p-7 sm:p-8"
          >
            <div className="flex items-center gap-3">
              <span className="mkt-icon-badge mkt-icon-badge--primary">
                <MarketingIcon
                  name={VALUE_ICONS[index % VALUE_ICONS.length]}
                  className="h-5 w-5"
                />
              </span>
              <p className="text-xs font-bold tracking-wider text-mkt-text-subtle">
                STEP {String(index + 1).padStart(2, '0')}
              </p>
            </div>
            <h3 className="mkt-h3 mt-5 text-lg sm:text-xl">{item.title}</h3>
            <p className="mkt-body mt-3">{item.description}</p>
            <div className="absolute bottom-0 left-8 right-8 h-0.5 rounded-t-full bg-gradient-to-r from-mkt-primary to-mkt-accent opacity-0 transition-opacity group-hover:opacity-100" />
          </article>
        ))}
      </div>
    </MarketingSection>
  );
}
