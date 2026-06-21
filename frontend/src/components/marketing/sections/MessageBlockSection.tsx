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
    <MarketingSection title={title} eyebrow={eyebrow} variant="default">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2 lg:gap-8">
        {items.map((item) => (
          <article
            key={item.keyword}
            className="mkt-card-shadow relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-sky-500 p-7 text-white sm:p-8"
          >
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
            <h3 className="text-lg font-extrabold sm:text-xl">{item.keyword}</h3>
            <p className="mt-4 text-sm leading-relaxed text-blue-50 sm:text-base">{item.body}</p>
          </article>
        ))}
      </div>
    </MarketingSection>
  );
}
