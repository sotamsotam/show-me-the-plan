import { MarketingSection, MultilineText } from '@/components/marketing/MarketingSection';
import type { KioskModeContent, KioskModeParagraph } from '@/content/marketing/types';
import { Fragment } from 'react';

function normalizeParagraph(paragraph: string | KioskModeParagraph): KioskModeParagraph {
  return typeof paragraph === 'string' ? { text: paragraph } : paragraph;
}

function renderHighlightedParagraph(text: string, highlights: string[] = []) {
  if (highlights.length === 0) {
    return text;
  }

  const highlightSet = new Set(highlights);
  const pattern = new RegExp(
    `(${highlights.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'g',
  );
  const parts = text.split(pattern);

  return parts.map((part, index) =>
    highlightSet.has(part) ? (
      <strong key={index} className="font-bold text-mkt-text">
        {part}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export default function KioskModeSection({ eyebrow, title, paragraphs, youtube }: KioskModeContent) {
  const embedSrc = `https://www.youtube.com/embed/${youtube.videoId}`;

  return (
    <MarketingSection variant="primary-tint">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
        <div className="max-w-xl">
          {eyebrow ? (
            <h2 className="mkt-h2 mb-2 !text-[1.2rem] text-mkt-primary-light sm:!text-3xl lg:!text-[2rem] lg:leading-tight">
              {eyebrow}
            </h2>
          ) : null}
          <h2 className="mkt-h2 !text-[1.2rem] sm:!text-3xl lg:!text-[2rem] lg:leading-tight">
            <MultilineText text={title} />
          </h2>
          <div className="mt-6 space-y-4">
            {paragraphs.map((paragraph, index) => {
              const { text, highlights } = normalizeParagraph(paragraph);

              return (
                <p
                  key={index}
                  className="whitespace-pre-line text-sm leading-relaxed text-mkt-text-muted sm:text-base sm:leading-7"
                >
                  {renderHighlightedParagraph(text, highlights)}
                </p>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-[17.5rem] overflow-hidden rounded-2xl bg-black shadow-mkt ring-1 ring-mkt-border sm:max-w-xs">
            <div className="relative aspect-[9/16] w-full">
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
        </div>
      </div>
    </MarketingSection>
  );
}
