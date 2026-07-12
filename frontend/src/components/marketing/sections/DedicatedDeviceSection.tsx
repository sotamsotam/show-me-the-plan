import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { DedicatedDeviceContent } from '@/content/marketing/types';

export default function DedicatedDeviceSection({
  title,
  headline,
  description,
  youtube,
}: DedicatedDeviceContent) {
  const embedSrc = youtube ? `https://www.youtube.com/embed/${youtube.videoId}` : null;

  return (
    <MarketingSection title={title} variant="primary-tint">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mkt-card-gradient rounded-3xl p-8 sm:p-10">
          <p className="text-lg font-extrabold leading-snug sm:text-xl sm:leading-relaxed">
            {headline}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-mkt-text-on-accent sm:text-base sm:leading-7">
            {description}
          </p>
          {embedSrc ? (
            <div className="mx-auto mt-8 w-full max-w-[17.5rem] overflow-hidden rounded-2xl bg-black shadow-mkt ring-1 ring-mkt-border sm:max-w-xs">
              <div className="relative aspect-[9/16] w-full">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={embedSrc}
                  title={youtube?.title ?? headline}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </MarketingSection>
  );
}
