import MarketingCtaButton from '@/components/marketing/MarketingCtaButton';
import { MarketingIcon, TARGET_ICONS } from '@/components/marketing/MarketingIcons';
import SectionHeading from '@/components/marketing/SectionHeading';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { TargetCard } from '@/content/marketing/types';

const cardStyles = [
  {
    accent: 'bg-gradient-to-r from-mkt-primary to-mkt-primary-light',
    surface: 'bg-gradient-to-br from-mkt-surface-warm to-mkt-surface',
    badge: 'mkt-icon-badge--primary',
  },
  {
    accent: 'bg-gradient-to-r from-mkt-accent to-[#3730a3]',
    surface: 'bg-gradient-to-br from-[#eef2ff] to-mkt-surface',
    badge: '',
  },
];

export default function TargetSplitSection({
  items,
}: {
  items: TargetCard[];
}) {
  return (
    <MarketingSection variant="primary-tint">
      <SectionHeading
        eyebrow="누구를 위한 서비스인가요?"
        title="학부모와 학생, 각각에 맞는 이야기"
      />
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {items.map((item, index) => {
          const style = cardStyles[index % cardStyles.length];
          const icon = TARGET_ICONS[index % TARGET_ICONS.length];

          return (
            <article
              key={item.href}
              className={`mkt-card-bordered mkt-card-hover flex flex-col overflow-hidden ${style.surface}`}
            >
              <div className={`h-1 ${style.accent}`} />
              <div className="flex flex-1 flex-col p-7 sm:p-8">
                <span className={`mkt-icon-badge mkt-icon-badge--lg ${style.badge}`}>
                  <MarketingIcon name={icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-xl font-bold text-mkt-text sm:text-2xl">{item.title}</h3>
                <p className="mkt-body mt-4 flex-1">{item.description}</p>
                <div className="mt-8">
                  <MarketingCtaButton
                    label={item.buttonLabel}
                    href={item.href}
                    variant="primary"
                    size="lg"
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </MarketingSection>
  );
}
