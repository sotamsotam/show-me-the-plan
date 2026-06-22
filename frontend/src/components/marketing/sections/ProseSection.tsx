import { MarketingSection } from '@/components/marketing/MarketingSection';
import SectionHeading from '@/components/marketing/SectionHeading';

export default function ProseSection({
  body,
  title,
  footnote,
  eyebrow,
}: {
  body: string;
  title?: string;
  footnote?: string;
  eyebrow?: string;
}) {
  return (
    <MarketingSection variant="accent-tint">
      {title ? (
        <SectionHeading eyebrow={eyebrow} title={title} align="center" />
      ) : null}
      <div className="mx-auto max-w-3xl">
        <p className="mkt-card-elevated p-7 text-center sm:p-10">
          <span className="mkt-body text-base sm:text-lg">{body}</span>
        </p>
        {footnote ? (
          <p className="mt-4 text-center text-xs text-mkt-text-subtle">{footnote}</p>
        ) : null}
      </div>
    </MarketingSection>
  );
}

export function StrategyListSection({
  title,
  items,
  eyebrow = '학습 전략',
}: {
  title: string;
  items: string[];
  eyebrow?: string;
}) {
  return (
    <MarketingSection variant="primary-tint">
      <SectionHeading eyebrow={eyebrow} title={title} />
      <ul className="mx-auto grid max-w-3xl gap-4">
        {items.map((item, index) => (
          <li
            key={item}
            className={`flex items-start gap-4 p-5 sm:p-6 ${index % 2 === 0 ? 'mkt-card-accent' : 'mkt-card-primary'}`}
          >
            <span className="mkt-icon-badge mkt-icon-badge--primary shrink-0 text-sm font-bold">
              {index + 1}
            </span>
            <span className="mkt-body pt-1 text-sm sm:text-base">{item}</span>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}
