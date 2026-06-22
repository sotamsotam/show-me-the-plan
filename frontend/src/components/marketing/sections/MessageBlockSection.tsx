import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { MessageBlock } from '@/content/marketing/types';

export default function MessageBlockSection({
  title,
  eyebrow = '왜 Show Me The Plan인가요?',
  items,
}: {
  title: string;
  eyebrow?: string;
  items: MessageBlock[];
}) {
  return (
    <MarketingSection title={title} eyebrow={eyebrow} variant="accent-strong">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2 lg:gap-8">
        {items.map((item) => (
          <article
            key={item.keyword}
            className="mkt-card-gradient relative overflow-hidden rounded-3xl p-7 sm:p-8"
          >
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
            <h3 className="text-lg font-extrabold sm:text-xl">{item.keyword}</h3>
            <p className="mt-4 text-sm leading-relaxed text-mkt-text-on-accent sm:text-base">{item.body}</p>
          </article>
        ))}
      </div>
    </MarketingSection>
  );
}
