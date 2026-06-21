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
    <MarketingSection title={title} eyebrow={eyebrow} variant="default">
      <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
        {items.map((item, index) => (
          <article
            key={item.title}
            className="mkt-card-shadow-sm group relative rounded-3xl bg-white p-7 ring-1 ring-gray-100 transition-transform duration-200 hover:-translate-y-1 sm:p-8"
          >
            <p className="text-xs font-bold tracking-[0.2em] text-blue-600">
              STEP {String(index + 1).padStart(2, '0')}
            </p>
            <h3 className="mt-4 text-xl font-extrabold text-gray-900">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
              {item.description}
            </p>
            <div className="absolute bottom-0 left-8 right-8 h-1 rounded-t-full bg-gradient-to-r from-blue-500 to-sky-400 opacity-0 transition-opacity group-hover:opacity-100" />
          </article>
        ))}
      </div>
    </MarketingSection>
  );
}
