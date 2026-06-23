import FaqSection from '@/components/marketing/sections/FaqSection';
import FeatureGridSection from '@/components/marketing/sections/FeatureGridSection';
import GradeCardsSection from '@/components/marketing/sections/GradeCardsSection';
import HeroSection from '@/components/marketing/sections/HeroSection';
import KeyFeaturesShowcaseSection from '@/components/marketing/sections/KeyFeaturesShowcaseSection';
import MarketingCtaSection from '@/components/marketing/sections/MarketingCtaSection';
import PlannerComparisonSection from '@/components/marketing/sections/PlannerComparisonSection';
import ProcessSection from '@/components/marketing/sections/ProcessSection';
import TargetSplitSection from '@/components/marketing/sections/TargetSplitSection';
import ValueCardsSection from '@/components/marketing/sections/ValueCardsSection';
import { CORE_VALUES, homeContent, homeSeo } from '@/content/marketing';
import { authOptions } from '@/lib/auth';
import {
  getDefaultDashboardPathFromSession,
  isMarketingHomeBypass,
} from '@/lib/account-helpers';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: homeSeo.title,
  description: homeSeo.description,
};

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { view?: string | string[] };
}) {
  const session = await getServerSession(authOptions);

  if (session?.user && !isMarketingHomeBypass(searchParams)) {
    redirect(getDefaultDashboardPathFromSession(session.user));
  }

  return (
    <>
      <HeroSection hero={homeContent.hero} showDefaultBadges animateHeadline />
      <KeyFeaturesShowcaseSection
        eyebrow={homeContent.keyFeaturesShowcase.eyebrow}
        title={homeContent.keyFeaturesShowcase.title}
        items={homeContent.keyFeaturesShowcase.items}
      />
      <PlannerComparisonSection {...homeContent.plannerComparison} />
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
