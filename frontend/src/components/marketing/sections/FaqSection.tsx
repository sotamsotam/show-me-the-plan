import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { FaqItem } from '@/content/marketing/types';
import type { ReactNode } from 'react';

export default function FaqSection({
  title,
  eyebrow = '자주 묻는 질문',
  description,
  items,
  footnote,
  variant = 'default',
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  items: FaqItem[];
  footnote?: ReactNode;
  variant?: 'default' | 'alt' | 'accent-tint' | 'primary-tint' | 'accent-strong';
}) {
  return (
    <MarketingSection title={title} eyebrow={eyebrow} description={description} variant={variant}>
      <div className="mx-auto max-w-3xl space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="mkt-card-elevated group overflow-hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-mkt-text marker:content-none [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <span
                className="shrink-0 text-lg leading-none text-mkt-text-subtle transition-transform group-open:rotate-45"
                aria-hidden
              >
                +
              </span>
            </summary>
            <div className="border-t border-mkt-border px-5 pb-4 pt-3">
              <p className="mkt-body text-sm leading-relaxed">{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
      {footnote ? <div className="mx-auto mt-8 max-w-3xl text-sm text-mkt-text-subtle">{footnote}</div> : null}
    </MarketingSection>
  );
}
