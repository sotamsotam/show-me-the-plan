import DedicatedDeviceSection from '@/components/marketing/sections/DedicatedDeviceSection';
import FeatureGridSection from '@/components/marketing/sections/FeatureGridSection';
import GradeCardsSection from '@/components/marketing/sections/GradeCardsSection';
import HeroSection from '@/components/marketing/sections/HeroSection';
import MarketingCtaSection from '@/components/marketing/sections/MarketingCtaSection';
import MessageGroupsSection from '@/components/marketing/sections/MessageGroupsSection';
import MessageBlockSection from '@/components/marketing/sections/MessageBlockSection';
import PainPointsSection from '@/components/marketing/sections/PainPointsSection';
import PlannerComparisonSection from '@/components/marketing/sections/PlannerComparisonSection';
import VideoInsightSection from '@/components/marketing/sections/VideoInsightSection';
import type { LandingPageContent } from '@/content/marketing/types';
import Link from 'next/link';

type LandingPageViewProps = LandingPageContent & {
  elementaryNote?: string;
};

export default function LandingPageView({
  hero,
  painPoints,
  videoInsight,
  messages,
  messageGroups,
  plannerComparison,
  features,
  dedicatedDevice,
  grades,
  bottomCta,
  elementaryNote,
}: LandingPageViewProps) {
  return (
    <>
      <HeroSection hero={hero} />
      {painPoints ? (
        <PainPointsSection title={painPoints.title} items={painPoints.items} />
      ) : null}
      {videoInsight ? <VideoInsightSection {...videoInsight} /> : null}
      {messageGroups ? <MessageGroupsSection {...messageGroups} /> : null}
      {plannerComparison ? <PlannerComparisonSection {...plannerComparison} /> : null}
      {messages ? (
        <MessageBlockSection title={messages.title} items={messages.items} />
      ) : null}
      {features ? (
        <FeatureGridSection title={features.title} items={features.items} />
      ) : null}
      {dedicatedDevice ? <DedicatedDeviceSection {...dedicatedDevice} /> : null}
      {grades ? (
        <>
          <GradeCardsSection
            eyebrow={grades.eyebrow}
            title={grades.title}
            items={grades.items}
          />
          {elementaryNote ? (
            <p className="-mt-6 bg-mkt-surface-accent-strong pb-10 text-center text-sm text-mkt-text-muted">
              초등학생은{' '}
              <Link
                href="/elementary"
                className="font-bold text-mkt-accent hover:underline"
              >
                초등 페이지
              </Link>
              를 확인하세요.
            </p>
          ) : null}
        </>
      ) : null}
      <MarketingCtaSection {...bottomCta} />
    </>
  );
}
