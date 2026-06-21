import MarketingCtaButton from '@/components/marketing/MarketingCtaButton';
import { MultilineText } from '@/components/marketing/MarketingSection';
import type { BottomCtaContent } from '@/content/marketing/types';
import Link from 'next/link';

type MarketingCtaSectionProps = {
  headline: string;
  subcopy?: string;
  eyebrow?: string;
  primaryCta?: BottomCtaContent['primaryCta'];
  secondaryCta?: BottomCtaContent['secondaryCta'];
  links?: { label: string; href: string }[];
};

export default function MarketingCtaSection({
  headline,
  subcopy,
  eyebrow = '지금 시작하기',
  primaryCta,
  secondaryCta,
  links,
}: MarketingCtaSectionProps) {
  return (
    <section className="mkt-cta-bg relative overflow-hidden py-16 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="text-sm font-bold tracking-wide text-blue-100">{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:text-4xl">
          <MultilineText text={headline} />
        </h2>
        {subcopy ? (
          <p className="mt-4 text-sm text-blue-100 sm:text-base">
            <MultilineText text={subcopy} />
          </p>
        ) : null}

        {links ? (
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex w-full max-w-xs items-center justify-center rounded-full bg-white px-8 py-4 text-base font-bold text-blue-700 shadow-lg shadow-black/10 transition-colors hover:bg-blue-50 sm:w-auto"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : primaryCta ? (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <MarketingCtaButton {...primaryCta} variant="inverse" size="lg" />
            {secondaryCta ? (
              <MarketingCtaButton
                label={secondaryCta.label}
                href={secondaryCta.href}
                variant="outline-light"
                size="lg"
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
