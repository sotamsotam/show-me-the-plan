import { MarketingSection, MultilineText } from '@/components/marketing/MarketingSection';
import type { KioskModeContent } from '@/content/marketing/types';

export default function KioskModeSection({ eyebrow, title, paragraphs, youtube }: KioskModeContent) {
  const embedSrc = `https://www.youtube.com/embed/${youtube.videoId}`;

  return (
    <MarketingSection variant="primary-tint">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
        <div className="max-w-xl">
          {eyebrow ? (
            <h2 className="mkt-h2 mb-2 text-2xl text-mkt-primary-light sm:text-3xl lg:text-[2rem] lg:leading-tight">
              {eyebrow}
            </h2>
          ) : null}
          <h2 className="mkt-h2 text-2xl sm:text-3xl lg:text-[2rem] lg:leading-tight">
            <MultilineText text={title} />
          </h2>
          <div className="mt-6 space-y-4">
            {paragraphs.map((paragraph, index) => (
              <p
                key={index}
                className="text-sm leading-relaxed text-mkt-text-muted sm:text-base sm:leading-7"
              >
                {paragraph}
              </p>
            ))}
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
