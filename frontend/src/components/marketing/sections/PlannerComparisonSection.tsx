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
      <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
        {items.map((item, index) => (
          <article key={item.title} className="mkt-card-elevated overflow-hidden">
            <div className="flex items-center gap-3 border-b border-mkt-border bg-mkt-surface-alt px-5 py-4 sm:px-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mkt-accent text-xs font-extrabold text-white">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="text-sm font-extrabold text-mkt-text sm:text-base">{item.title}</h3>
            </div>

            <div className="grid sm:grid-cols-2">
              <div className="border-b border-mkt-border p-5 sm:border-b-0 sm:border-r sm:p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-mkt-text-subtle">
                  종이 플래너
                </p>
                <p className="mkt-body mt-2 text-sm">{item.paper}</p>
              </div>
              <div className="mkt-accent-surface p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-mkt-accent">쇼미플</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-mkt-text">{item.smtp}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

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
