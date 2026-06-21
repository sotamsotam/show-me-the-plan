import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { VideoInsightContent } from '@/content/marketing/types';
import { Fragment } from 'react';

function renderHighlightedBody(body: string, highlights: string[] = []) {
  if (highlights.length === 0) {
    return body;
  }

  const highlightSet = new Set(highlights);
  const pattern = new RegExp(
    `(${highlights.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'g',
  );
  const parts = body.split(pattern);

  return parts.map((part, index) =>
    highlightSet.has(part) ? (
      <strong key={index} className="font-bold text-blue-600">
        {part}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export default function VideoInsightSection({
  title,
  youtube,
  source,
  insight,
}: VideoInsightContent) {
  const embedSrc = `https://www.youtube.com/embed/${youtube.videoId}?start=${youtube.startSeconds}`;

  return (
    <MarketingSection title={title} variant="default">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl bg-black shadow-lg ring-1 ring-gray-200">
          <div className="relative aspect-video w-full">
            <iframe
              className="absolute inset-0 h-full w-full"
              src={embedSrc}
              title={youtube.title ?? title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>

        <p className="mt-3 text-center text-xs leading-relaxed text-gray-500">{source}</p>

        <article className="mkt-card-shadow-sm mt-10 rounded-3xl bg-[#f5f7fa] p-6 ring-1 ring-gray-100 sm:p-8">
          <h3 className="text-lg font-extrabold text-gray-900 sm:text-xl">{insight.title}</h3>
          <p className="mt-4 text-sm leading-relaxed text-gray-700 sm:text-base sm:leading-7">
            {renderHighlightedBody(insight.body, insight.highlights)}
          </p>

          {insight.cases && insight.cases.length > 0 ? (
            <div className="mt-8 space-y-4 border-t border-gray-200 pt-8">
              {insight.cases.map((caseItem) => (
                <div
                  key={caseItem.name}
                  className="rounded-2xl bg-white p-5 ring-1 ring-gray-100 sm:p-6"
                >
                  <h4 className="text-sm font-extrabold text-gray-900 sm:text-base">
                    {caseItem.name}
                  </h4>
                  {caseItem.subtitle ? (
                    <p className="mt-1 text-xs text-gray-500">{caseItem.subtitle}</p>
                  ) : null}
                  <p className="mt-3 text-sm leading-relaxed text-gray-700 sm:leading-7">
                    {renderHighlightedBody(caseItem.summary, caseItem.highlights)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </MarketingSection>
  );
}
