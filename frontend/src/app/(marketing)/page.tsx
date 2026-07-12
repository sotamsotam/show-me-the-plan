import FaqSection from '@/components/marketing/sections/FaqSection';
import FeatureGridSection from '@/components/marketing/sections/FeatureGridSection';
import GradeCardsSection from '@/components/marketing/sections/GradeCardsSection';
import HeroSection from '@/components/marketing/sections/HeroSection';
import HomeFeaturedReviewsSection from '@/components/marketing/sections/HomeFeaturedReviewsSection';
import DedicatedDeviceSection from '@/components/marketing/sections/DedicatedDeviceSection';
import KeyFeaturesShowcaseSection from '@/components/marketing/sections/KeyFeaturesShowcaseSection';
import PlannerComparisonSection from '@/components/marketing/sections/PlannerComparisonSection';
import PcMobileShowcaseSection from '@/components/marketing/sections/PcMobileShowcaseSection';
import ProcessSection from '@/components/marketing/sections/ProcessSection';
import StudyPlannerStorySection from '@/components/marketing/sections/StudyPlannerStorySection';
import { homeContent, homeSeo } from '@/content/marketing';
import { authOptions } from '@/lib/auth';
import {
  getDefaultDashboardPathFromSession,
  isMarketingHomeBypass,
} from '@/lib/account-helpers';
import type { HomeFeaturedReview } from '@/lib/user-review';
import { strapiFetch } from '@/lib/strapi';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: homeSeo.title,
  description: homeSeo.description,
};

async function loadHomeFeaturedReviews(): Promise<HomeFeaturedReview[]> {
  try {
    const res = await strapiFetch('/api/user-reviews/home-featured', {
      cache: 'no-store',
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return (data as { reviews?: HomeFeaturedReview[] }).reviews ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { view?: string | string[] };
}) {
  const session = await getServerSession(authOptions);

  if (session?.user && !isMarketingHomeBypass(searchParams)) {
    redirect(getDefaultDashboardPathFromSession(session.user));
  }

  const homeFeaturedReviews = await loadHomeFeaturedReviews();

  return (
    <>
      <HeroSection hero={homeContent.hero} showDefaultBadges animateHeadline />
      <StudyPlannerStorySection {...homeContent.studyPlannerStory} />
      <KeyFeaturesShowcaseSection
        eyebrow={homeContent.keyFeaturesShowcase.eyebrow}
        title={homeContent.keyFeaturesShowcase.title}
        items={homeContent.keyFeaturesShowcase.items}
      />
      <PlannerComparisonSection {...homeContent.plannerComparison} />
      <PcMobileShowcaseSection {...homeContent.pcMobileShowcase} />
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
      <DedicatedDeviceSection {...homeContent.dedicatedDevice} />
      <HomeFeaturedReviewsSection reviews={homeFeaturedReviews} />
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
    </>
  );
}
