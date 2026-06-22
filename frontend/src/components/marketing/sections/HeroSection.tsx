import HeroAnimatedHeadline from '@/components/marketing/HeroAnimatedHeadline';
import HeroAppPreview from '@/components/marketing/HeroAppPreview';
import MarketingCtaButton from '@/components/marketing/MarketingCtaButton';
import { MultilineText } from '@/components/marketing/MarketingSection';
import { SUB_SLOGAN } from '@/content/marketing/common';
import type { HeroContent } from '@/content/marketing/types';
import Image from 'next/image';

type HeroSectionProps = {
  hero: HeroContent;
  badges?: string[];
  showDefaultBadges?: boolean;
  animateHeadline?: boolean;
};

const DEFAULT_BADGES = ['학교시간표 자동연동', '시험기간 D-day 자동계산', '순공시간 타이머'];

function HeroTextBlock({
  hero,
  badges,
  visual = false,
  animateHeadline = false,
}: {
  hero: HeroContent;
  badges: string[];
  visual?: boolean;
  animateHeadline?: boolean;
}) {
  const layoutClass = visual
    ? 'mx-auto max-w-xl text-center md:mx-0 md:max-w-none md:text-left'
    : 'mx-auto max-w-xl text-center';
  const ctaAlignClass = visual
    ? 'justify-center md:justify-start'
    : 'justify-center';
  const badgeAlignClass = visual
    ? 'justify-center md:justify-start'
    : 'justify-center';
  const eyebrowClass = visual ? '' : 'mx-auto';

  return (
    <div className={layoutClass}>
      <p
        className={`mkt-eyebrow mkt-hero-stagger mkt-hero-stagger-1 mb-4 inline-flex rounded-full bg-white/80 px-4 py-1.5 text-xs shadow-sm ring-1 ring-mkt-border backdrop-blur sm:text-sm ${eyebrowClass}`}
      >
        {SUB_SLOGAN}
      </p>

      <h1
        className="mkt-h1"
        aria-label={animateHeadline ? hero.headline.replace(/\n/g, ' ') : undefined}
      >
        {animateHeadline ? (
          <HeroAnimatedHeadline text={hero.headline} />
        ) : (
          <MultilineText text={hero.headline} stacked />
        )}
      </h1>

      <p className="mkt-lead mkt-hero-stagger mkt-hero-stagger-2 mt-6">
        <MultilineText text={hero.subcopy} />
      </p>

      {(hero.primaryCta || hero.secondaryCta) && (
        <div
          className={`mkt-hero-stagger mkt-hero-stagger-3 mt-10 flex flex-wrap items-center gap-3 sm:gap-4 ${ctaAlignClass}`}
        >
          {hero.primaryCta ? <MarketingCtaButton {...hero.primaryCta} size="lg" /> : null}
          {hero.secondaryCta ? (
            <MarketingCtaButton {...hero.secondaryCta} size="lg" />
          ) : null}
        </div>
      )}

      {badges.length > 0 ? (
        <ul
          className={`mkt-hero-stagger mkt-hero-stagger-4 mt-10 flex flex-wrap gap-2 sm:gap-3 ${badgeAlignClass}`}
        >
          {badges.map((badge) => (
            <li
              key={badge}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-mkt-text-muted shadow-sm ring-1 ring-mkt-border sm:text-sm"
            >
              {badge}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function HeroVisual({ hero }: { hero: HeroContent }) {
  if (hero.image) {
    return (
      <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
        <div className="relative aspect-[4/3] w-full sm:aspect-[5/4]">
          <Image
            src={hero.image.src}
            alt={hero.image.alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain object-bottom"
          />
        </div>
      </div>
    );
  }

  if (hero.appPreview) {
    return <HeroAppPreview />;
  }

  return null;
}

export default function HeroSection({
  hero,
  badges,
  showDefaultBadges = false,
  animateHeadline = false,
}: HeroSectionProps) {
  const displayBadges = badges ?? (showDefaultBadges ? DEFAULT_BADGES : []);
  const hasVisual = Boolean(hero.image || hero.appPreview);

  return (
    <section className="mkt-hero-bg relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zMCAwaDEiIGZpbGw9IiNlNWU3ZWIiIG9wYWNpdHk9Ii4zIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')] opacity-40" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        {hasVisual ? (
          <div className="grid items-start gap-10 md:grid-cols-2 md:gap-10 lg:gap-14">
            <HeroTextBlock
              hero={hero}
              badges={displayBadges}
              visual
              animateHeadline={animateHeadline}
            />
            <HeroVisual hero={hero} />
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            <HeroTextBlock
              hero={hero}
              badges={displayBadges}
              animateHeadline={animateHeadline}
            />
          </div>
        )}
      </div>
    </section>
  );
}
