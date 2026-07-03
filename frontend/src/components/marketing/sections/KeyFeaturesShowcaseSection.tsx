import MarketingCtaButton from '@/components/marketing/MarketingCtaButton';
import ShowcaseFatigueTitle from '@/components/marketing/ShowcaseFatigueTitle';
import type { KeyFeatureShowcaseItem, KeyFeatureShowcaseScreen } from '@/content/marketing/types';
import Image from 'next/image';

function ShowcaseMedia({
  screen,
  sizes,
  className,
}: {
  screen: KeyFeatureShowcaseScreen;
  sizes: string;
  className: string;
}) {
  if (screen.type === 'video') {
    return (
      <video
        src={screen.src}
        aria-label={screen.alt}
        autoPlay
        loop
        muted
        playsInline
        className={className}
      />
    );
  }

  return (
    <Image
      src={screen.src}
      alt={screen.alt}
      fill
      sizes={sizes}
      className={className}
    />
  );
}

function ShowcaseScreen({ screen }: { screen: KeyFeatureShowcaseScreen }) {
  const useMobileFrame = screen.device === 'mobile' && screen.type !== 'video';

  if (useMobileFrame) {
    return (
      <div className="relative mx-auto w-full max-w-[15rem] sm:max-w-[16.5rem] lg:mx-0 lg:ml-auto">
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1.75rem] bg-white shadow-[0_5px_15px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.1)] sm:rounded-[2rem]">
          <ShowcaseMedia
            screen={screen}
            sizes="(max-width: 768px) 60vw, 264px"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl lg:mx-0 lg:max-w-none">
      <div className="relative overflow-hidden rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.1)] sm:rounded-2xl">
        <div className="relative aspect-[16/10] w-full">
          <ShowcaseMedia
            screen={screen}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        </div>
      </div>
    </div>
  );
}

function ShowcaseCard({ item }: { item: KeyFeatureShowcaseItem }) {
  return (
    <article className="mkt-showcase-card rounded-3xl bg-white p-8 sm:p-10 lg:p-12">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
        <div className="max-w-xl lg:pr-4">
          <h3 className="text-[1.625rem] font-bold leading-[1.3] tracking-[-0.03em] text-mkt-text sm:text-[1.875rem] lg:text-[2rem]">
            <span className="block">{item.title}</span>
            <span className="mt-0.5 block">{item.titleAccent}</span>
          </h3>

          <p className="mt-4 text-[0.9375rem] leading-relaxed text-mkt-text-muted sm:mt-5 sm:text-base lg:text-[1.0625rem]">
            {item.description}
          </p>

          <div className="mt-6">
            <MarketingCtaButton
              label={item.detailLabel ?? '자세히 보기'}
              href={item.detailHref}
              variant="secondary"
            />
          </div>
        </div>

        <div className="lg:pl-2">
          <ShowcaseScreen screen={item.screen} />
        </div>
      </div>
    </article>
  );
}

export default function KeyFeaturesShowcaseSection({
  eyebrow,
  title,
  items,
}: {
  eyebrow?: string;
  title?: string;
  items: readonly KeyFeatureShowcaseItem[];
}) {
  return (
    <section className="mkt-showcase-section overflow-hidden py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {eyebrow || title ? (
          <div className="mb-10 text-center sm:mb-12 lg:mb-14">
            {eyebrow ? (
              <p className="text-sm font-bold tracking-[0.14em] text-white/75 uppercase sm:text-base">
                {eyebrow}
              </p>
            ) : null}
            {title ? <ShowcaseFatigueTitle title={title} /> : null}
          </div>
        ) : null}
        <div className="mkt-showcase-stack flex flex-col gap-6 sm:gap-8">
          {items.map((item) => (
            <ShowcaseCard key={item.titleAccent} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
