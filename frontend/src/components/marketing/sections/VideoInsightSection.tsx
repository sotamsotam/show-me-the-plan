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
      <strong key={index} className="font-bold text-mkt-accent">
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
    <MarketingSection title={title} variant="primary-tint">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl bg-black shadow-mkt ring-1 ring-mkt-border">
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

        <p className="mt-3 text-center text-xs leading-relaxed text-mkt-text-subtle">{source}</p>

        <article className="mkt-card-elevated mt-10 p-6 sm:p-8">
          <h3 className="mkt-h3 text-lg sm:text-xl">{insight.title}</h3>
          <p className="mkt-body mt-4 text-sm sm:text-base sm:leading-7">
            {renderHighlightedBody(insight.body, insight.highlights)}
          </p>

          {insight.cases && insight.cases.length > 0 ? (
            <div className="mt-8 space-y-4 border-t border-mkt-border pt-8">
              {insight.cases.map((caseItem, caseIndex) => (
                <div
                  key={caseItem.name}
                  className={`p-5 sm:p-6 ${caseIndex % 2 === 0 ? 'mkt-card-accent' : 'mkt-card-primary'}`}
                >
                  <h4 className="text-sm font-extrabold text-mkt-text sm:text-base">
                    {caseItem.name}
                  </h4>
                  {caseItem.subtitle ? (
                    <p className="mt-1 text-xs text-mkt-text-subtle">{caseItem.subtitle}</p>
                  ) : null}
                  <p className="mkt-body mt-3 text-sm sm:leading-7">
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
