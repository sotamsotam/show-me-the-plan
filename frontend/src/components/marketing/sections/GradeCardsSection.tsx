import { GRADE_ICONS, MarketingIcon } from '@/components/marketing/MarketingIcons';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { GradeCard } from '@/content/marketing/types';
import Link from 'next/link';

const gradeStyles = [
  {
    bar: 'bg-gradient-to-r from-emerald-600 to-teal-600',
    label: 'text-emerald-700',
  },
  {
    bar: 'bg-gradient-to-r from-mkt-primary to-mkt-primary-light',
    label: 'text-mkt-primary',
  },
  {
    bar: 'bg-gradient-to-r from-mkt-accent to-indigo-700',
    label: 'text-mkt-accent',
  },
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
    <MarketingSection title={title} eyebrow={eyebrow} variant="accent-strong">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {items.map((item, index) => {
          const style = gradeStyles[index % gradeStyles.length];
          const icon = GRADE_ICONS[index % GRADE_ICONS.length];

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group mkt-card-elevated overflow-hidden"
            >
              <div className={`h-1.5 ${style.bar}`} />
              <div className="p-6 sm:p-7">
                <div className="flex items-center gap-3">
                  <span className={`mkt-icon-badge ${index === 0 ? 'mkt-icon-badge--primary' : ''}`}>
                    <MarketingIcon name={icon} className="h-5 w-5" />
                  </span>
                  <p className={`text-sm font-bold ${style.label}`}>{item.title}</p>
                </div>
                {item.subtitle ? (
                  <h3 className="mkt-h3 mt-3 text-lg group-hover:text-mkt-primary-light sm:text-xl">
                    {item.subtitle}
                  </h3>
                ) : (
                  <h3 className="mkt-h3 mt-3 text-lg group-hover:text-mkt-primary-light sm:text-xl">
                    {item.title}
                  </h3>
                )}
                <p className="mkt-body mt-3 text-sm">{item.description}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-mkt-accent">
                  자세히 보기
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </MarketingSection>
  );
}
