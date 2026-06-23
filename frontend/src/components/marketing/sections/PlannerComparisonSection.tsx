import PlannerComparisonCards from '@/components/marketing/PlannerComparisonCards';
import PlannerVsShowcase from '@/components/marketing/PlannerVsShowcase';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { PlannerComparisonContent } from '@/content/marketing/types';

export default function PlannerComparisonSection({
  title,
  items,
  summaryRows,
  tagline,
  subtagline,
}: PlannerComparisonContent) {
  return (
    <MarketingSection title={title} variant="warm">
      <PlannerVsShowcase />
      <PlannerComparisonCards items={items} />

      <div className="mkt-card-elevated mt-12 overflow-hidden">
        <div className="grid grid-cols-2 border-b border-mkt-border bg-mkt-surface-alt text-center text-sm font-extrabold">
          <div className="border-r border-mkt-border px-4 py-4 text-mkt-text-subtle">종이 플래너</div>
          <div className="px-4 py-4 text-mkt-accent">쇼미플</div>
        </div>
        {summaryRows.map((row) => (
          <div
            key={row.paper}
            className="grid grid-cols-2 border-b border-mkt-border last:border-b-0"
          >
            <div className="border-r border-mkt-border px-4 py-3.5 text-center text-sm text-mkt-text-muted sm:px-6 sm:py-4">
              {row.paper}
            </div>
            <div className="mkt-accent-surface px-4 py-3.5 text-center text-sm font-semibold text-mkt-text sm:px-6 sm:py-4">
              {row.smtp}
            </div>
          </div>
        ))}
      </div>

      <blockquote className="mx-auto mt-10 max-w-3xl text-center">
        <p className="mkt-h3 text-lg sm:text-xl sm:leading-relaxed">
          {tagline}
        </p>
        {subtagline ? (
          <p className="mt-4 text-base font-semibold leading-relaxed text-mkt-accent sm:text-lg">
            {subtagline}
          </p>
        ) : null}
      </blockquote>
    </MarketingSection>
  );
}
