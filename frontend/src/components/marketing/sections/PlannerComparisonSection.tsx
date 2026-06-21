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
    <MarketingSection title={title} variant="alt">
      <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
        {items.map((item, index) => (
          <article
            key={item.title}
            className="mkt-card-shadow-sm overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100"
          >
            <div className="flex items-center gap-3 border-b border-gray-100 bg-[#f8fafc] px-5 py-4 sm:px-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-extrabold text-white">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="text-sm font-extrabold text-gray-900 sm:text-base">{item.title}</h3>
            </div>

            <div className="grid sm:grid-cols-2">
              <div className="border-b border-gray-100 p-5 sm:border-b-0 sm:border-r sm:p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">종이 플래너</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.paper}</p>
              </div>
              <div className="bg-[#f0f6ff] p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">쇼미플</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-gray-800">{item.smtp}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mkt-card-shadow-sm mt-12 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100">
        <div className="grid grid-cols-2 border-b border-gray-100 bg-[#f8fafc] text-center text-sm font-extrabold">
          <div className="border-r border-gray-100 px-4 py-4 text-gray-500">종이 플래너</div>
          <div className="px-4 py-4 text-blue-600">쇼미플</div>
        </div>
        {summaryRows.map((row) => (
          <div
            key={row.paper}
            className="grid grid-cols-2 border-b border-gray-100 last:border-b-0"
          >
            <div className="border-r border-gray-100 px-4 py-3.5 text-center text-sm text-gray-600 sm:px-6 sm:py-4">
              {row.paper}
            </div>
            <div className="bg-[#f0f6ff] px-4 py-3.5 text-center text-sm font-semibold text-gray-900 sm:px-6 sm:py-4">
              {row.smtp}
            </div>
          </div>
        ))}
      </div>

      <blockquote className="mx-auto mt-10 max-w-3xl text-center">
        <p className="text-lg font-extrabold leading-snug text-gray-900 sm:text-xl sm:leading-relaxed">
          {tagline}
        </p>
        {subtagline ? (
          <p className="mt-4 text-base font-semibold leading-relaxed text-blue-600 sm:text-lg">
            {subtagline}
          </p>
        ) : null}
      </blockquote>
    </MarketingSection>
  );
}
