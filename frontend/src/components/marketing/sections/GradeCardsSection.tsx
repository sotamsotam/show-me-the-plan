import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { GradeCard } from '@/content/marketing/types';
import Link from 'next/link';

const gradeColors = [
  'from-emerald-500 to-teal-500',
  'from-blue-500 to-indigo-500',
  'from-violet-500 to-purple-500',
];

export default function GradeCardsSection({
  title,
  eyebrow = '학령별 안내',
  items,
}: {
  title: string;
  eyebrow?: string;
  items: GradeCard[];
}) {
  return (
    <MarketingSection title={title} eyebrow={eyebrow} variant="alt">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {items.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className="group mkt-card-shadow-sm overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100 transition-transform duration-200 hover:-translate-y-1"
          >
            <div className={`h-2 bg-gradient-to-r ${gradeColors[index % gradeColors.length]}`} />
            <div className="p-6 sm:p-7">
              <p className="text-sm font-bold text-blue-600">{item.title}</p>
              {item.subtitle ? (
                <h3 className="mt-1 text-xl font-extrabold text-gray-900 group-hover:text-blue-700">
                  {item.subtitle}
                </h3>
              ) : (
                <h3 className="mt-1 text-xl font-extrabold text-gray-900 group-hover:text-blue-700">
                  {item.title}
                </h3>
              )}
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-blue-600">
                자세히 보기
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </MarketingSection>
  );
}
