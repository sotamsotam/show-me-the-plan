import FaqSection from '@/components/marketing/sections/FaqSection';
import FeatureGridSection from '@/components/marketing/sections/FeatureGridSection';
import GradeCardsSection from '@/components/marketing/sections/GradeCardsSection';
import HeroSection from '@/components/marketing/sections/HeroSection';
import MarketingCtaSection from '@/components/marketing/sections/MarketingCtaSection';
import ProcessSection from '@/components/marketing/sections/ProcessSection';
import TargetSplitSection from '@/components/marketing/sections/TargetSplitSection';
import ValueCardsSection from '@/components/marketing/sections/ValueCardsSection';
import { CORE_VALUES, homeContent, homeSeo } from '@/content/marketing';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: homeSeo.title,
  description: homeSeo.description,
};

export default function HomePage() {
  return (
    <>
      <HeroSection hero={homeContent.hero} showDefaultBadges />
      <TargetSplitSection items={homeContent.targetCards} />
      <ValueCardsSection
        eyebrow="핵심 가치"
        title={homeContent.valuesTitle}
        items={CORE_VALUES}
      />
      <FeatureGridSection
        eyebrow="올인원 학습 관리"
        title={homeContent.featuresTitle}
        items={homeContent.features}
      />
      <ProcessSection
        eyebrow={homeContent.process.eyebrow}
        title={homeContent.process.title}
        description={homeContent.process.description}
        steps={homeContent.process.steps}
      />
      <GradeCardsSection
        eyebrow="학년별 맞춤"
        title={homeContent.gradesTitle}
        items={homeContent.grades}
      />
      <FaqSection
        eyebrow={homeContent.faq.eyebrow}
        title={homeContent.faq.title}
        items={homeContent.faq.items}
        variant="default"
        footnote={
          <>
            요금·결제·해지는{' '}
            <Link href="/pricing" className="font-semibold text-mkt-accent hover:underline">
              요금 안내
            </Link>
            와{' '}
            <Link href="/legal/paid-service" className="font-semibold text-mkt-accent hover:underline">
              유료서비스 이용약관
            </Link>
            을 확인해 주세요.
          </>
        }
      />
      <MarketingCtaSection
        eyebrow="시작하기"
        headline={homeContent.bottomCta.headline}
        links={homeContent.bottomCta.links}
      />
    </>
  );
}
