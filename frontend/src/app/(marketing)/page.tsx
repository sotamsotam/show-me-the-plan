import FeatureGridSection from '@/components/marketing/sections/FeatureGridSection';
import GradeCardsSection from '@/components/marketing/sections/GradeCardsSection';
import HeroSection from '@/components/marketing/sections/HeroSection';
import MarketingCtaSection from '@/components/marketing/sections/MarketingCtaSection';
import TargetSplitSection from '@/components/marketing/sections/TargetSplitSection';
import ValueCardsSection from '@/components/marketing/sections/ValueCardsSection';
import { CORE_VALUES, homeContent, homeSeo } from '@/content/marketing';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: homeSeo.title,
  description: homeSeo.description,
};

export default function HomePage() {
  return (
    <>
      <HeroSection
        hero={{
          headline: homeContent.hero.headline,
          subcopy: homeContent.hero.subcopy,
        }}
        showDefaultBadges
      />
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
      <GradeCardsSection
        eyebrow="학년별 맞춤"
        title={homeContent.gradesTitle}
        items={homeContent.grades}
      />
      <MarketingCtaSection
        eyebrow="시작하기"
        headline={homeContent.bottomCta.headline}
        links={homeContent.bottomCta.links}
      />
    </>
  );
}
