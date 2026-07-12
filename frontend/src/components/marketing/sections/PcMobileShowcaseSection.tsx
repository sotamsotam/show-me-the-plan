import PcMobileShowcaseVisual from '@/components/marketing/PcMobileShowcaseVisual';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import SectionHeading from '@/components/marketing/SectionHeading';
import type { PcMobileShowcaseContent } from '@/content/marketing/types';

export default function PcMobileShowcaseSection({
  title,
  lead,
  cardHeadline,
  features,
  screen,
}: PcMobileShowcaseContent) {
  return (
    <MarketingSection variant="default">
      <SectionHeading title={title} description={lead} />

      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
          <div className="max-w-xl">
            <p className="whitespace-pre-line text-lg font-bold leading-snug text-mkt-text sm:text-xl">
              {cardHeadline}
            </p>

            <ul className="mt-6 space-y-6 sm:mt-8">
              {features.map((feature) => (
                <li key={feature.title}>
                  <h3 className="mkt-h3 whitespace-pre-line text-base leading-snug sm:text-lg">
                    {feature.title}
                  </h3>
                  {feature.points && feature.points.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {feature.points.map((point) => (
                        <li
                          key={point}
                          className="mkt-body flex gap-2 text-sm sm:text-[15px]"
                        >
                          <span
                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mkt-accent"
                            aria-hidden
                          />
                          <span className="whitespace-pre-line">{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:pl-2">
            <PcMobileShowcaseVisual screen={screen} />
          </div>
      </div>
    </MarketingSection>
  );
}
