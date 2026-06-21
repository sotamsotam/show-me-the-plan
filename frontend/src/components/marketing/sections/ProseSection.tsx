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
    <MarketingSection variant="warm">
      {title ? (
        <SectionHeading eyebrow={eyebrow} title={title} align="center" />
      ) : null}
      <div className="mx-auto max-w-3xl">
        <p className="rounded-3xl bg-white p-7 text-center text-base leading-relaxed text-gray-700 ring-1 ring-gray-100 sm:p-10 sm:text-lg">
          {body}
        </p>
        {footnote ? (
          <p className="mt-4 text-center text-xs text-gray-500">{footnote}</p>
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
    <MarketingSection variant="default">
      <SectionHeading eyebrow={eyebrow} title={title} />
      <ul className="mx-auto grid max-w-3xl gap-4">
        {items.map((item, index) => (
          <li
            key={item}
            className="mkt-card-shadow-sm flex items-start gap-4 rounded-3xl bg-white p-5 ring-1 ring-gray-100 sm:p-6"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {index + 1}
            </span>
            <span className="pt-1 text-sm leading-relaxed text-gray-700 sm:text-base">{item}</span>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}
