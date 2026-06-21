import SectionHeading from '@/components/marketing/SectionHeading';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { CrossLinkCard } from '@/content/marketing/types';
import Link from 'next/link';

export default function CrossLinkSection({ items }: { items: CrossLinkCard[] }) {
  return (
    <MarketingSection variant="default">
      <SectionHeading eyebrow="더 알아보기" title="다른 페이지도 확인해 보세요" />
      <div className="flex flex-wrap justify-center gap-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full bg-[#f5f7fa] px-6 py-3 text-sm font-bold text-gray-700 ring-1 ring-gray-200 transition-all hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </MarketingSection>
  );
}
