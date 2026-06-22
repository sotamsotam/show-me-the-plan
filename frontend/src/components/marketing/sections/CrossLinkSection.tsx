import SectionHeading from '@/components/marketing/SectionHeading';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { CrossLinkCard } from '@/content/marketing/types';
import Link from 'next/link';

export default function CrossLinkSection({ items }: { items: CrossLinkCard[] }) {
  return (
    <MarketingSection variant="warm">
      <SectionHeading eyebrow="더 알아보기" title="다른 페이지도 확인해 보세요" />
      <div className="flex flex-wrap justify-center gap-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full bg-mkt-surface-alt px-6 py-3 text-sm font-bold text-mkt-text-muted ring-1 ring-mkt-border transition-all hover:bg-mkt-surface-warm hover:text-mkt-accent hover:ring-mkt-accent"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </MarketingSection>
  );
}
