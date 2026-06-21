import MarketingCtaButton from '@/components/marketing/MarketingCtaButton';
import { MultilineText } from '@/components/marketing/MarketingSection';
import { SUB_SLOGAN } from '@/content/marketing/common';
import type { HeroContent } from '@/content/marketing/types';
import Image from 'next/image';

type HeroSectionProps = {
  hero: HeroContent;
  badges?: string[];
  showDefaultBadges?: boolean;
};

const DEFAULT_BADGES = ['NEIS 시간표 연동', '분량 중심 학습', '초·중·고 맞춤'];

function HeroTextBlock({
  hero,
  badges,
  align = 'center',
}: {
  hero: HeroContent;
  badges: string[];
  align?: 'center' | 'left';
}) {
  const alignClass = align === 'left' ? 'text-left' : 'text-center mx-auto';
  const ctaAlignClass = align === 'left' ? 'justify-start' : 'justify-center';
  const badgeAlignClass = align === 'left' ? 'justify-start' : 'justify-center';

  return (
    <div className={`max-w-xl ${alignClass}`}>
      <p
        className={`mb-4 inline-flex rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold tracking-wide text-blue-700 shadow-sm ring-1 ring-blue-100 backdrop-blur sm:text-sm ${align === 'left' ? '' : 'mx-auto'}`}
      >
        {SUB_SLOGAN}
      </p>

      <h1 className="text-3xl font-extrabold leading-snug tracking-tight text-gray-900 sm:text-4xl sm:leading-snug lg:text-[2.75rem] lg:leading-[1.35]">
        <MultilineText text={hero.headline} stacked />
      </h1>

      <p className="mt-6 text-base leading-relaxed text-gray-600 sm:text-lg">
        <MultilineText text={hero.subcopy} />
      </p>

      {(hero.primaryCta || hero.secondaryCta) && (
        <div className={`mt-10 flex flex-wrap items-center gap-3 sm:gap-4 ${ctaAlignClass}`}>
          {hero.primaryCta ? <MarketingCtaButton {...hero.primaryCta} size="lg" /> : null}
          {hero.secondaryCta ? (
            <MarketingCtaButton {...hero.secondaryCta} size="lg" />
          ) : null}
        </div>
      )}

      {badges.length > 0 ? (
        <ul className={`mt-10 flex flex-wrap gap-2 sm:gap-3 ${badgeAlignClass}`}>
          {badges.map((badge) => (
            <li
              key={badge}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 sm:text-sm"
            >
              {badge}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function HeroSection({
  hero,
  badges,
  showDefaultBadges = false,
}: HeroSectionProps) {
  const displayBadges = badges ?? (showDefaultBadges ? DEFAULT_BADGES : []);
  const hasImage = Boolean(hero.image);

  return (
    <section className="mkt-hero-bg relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zMCAwaDEiIGZpbGw9IiNlNWU3ZWIiIG9wYWNpdHk9Ii4zIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')] opacity-40" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        {hasImage && hero.image ? (
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
            <HeroTextBlock hero={hero} badges={displayBadges} align="left" />
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
          </div>
        ) : (
          <div className="mx-auto max-w-4xl text-center">
            <HeroTextBlock hero={hero} badges={displayBadges} align="center" />
          </div>
        )}
      </div>
    </section>
  );
}
