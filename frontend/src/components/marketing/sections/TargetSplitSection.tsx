import MarketingCtaButton from '@/components/marketing/MarketingCtaButton';
import SectionHeading from '@/components/marketing/SectionHeading';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { TargetCard } from '@/content/marketing/types';

const cardStyles = [
  {
    accent: 'from-blue-600 to-blue-500',
    ring: 'ring-blue-100',
    bg: 'bg-gradient-to-br from-blue-50 to-white',
  },
  {
    accent: 'from-sky-500 to-cyan-500',
    ring: 'ring-sky-100',
    bg: 'bg-gradient-to-br from-sky-50 to-white',
  },
];

export default function TargetSplitSection({
  items,
}: {
  items: TargetCard[];
}) {
  return (
    <MarketingSection variant="alt">
      <SectionHeading
        eyebrow="누구를 위한 서비스인가요?"
        title="학부모와 학생, 각각에 맞는 이야기"
      />
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {items.map((item, index) => {
          const style = cardStyles[index % cardStyles.length];

          return (
            <article
              key={item.href}
              className={`mkt-card-shadow flex flex-col overflow-hidden rounded-3xl ring-1 ${style.ring} ${style.bg}`}
            >
              <div className={`h-1.5 bg-gradient-to-r ${style.accent}`} />
              <div className="flex flex-1 flex-col p-7 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 text-2xl font-extrabold text-gray-900">{item.title}</h3>
                <p className="mt-4 flex-1 text-base leading-relaxed text-gray-600">
                  {item.description}
                </p>
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
