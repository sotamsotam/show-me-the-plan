import CrossLinkSection from '@/components/marketing/sections/CrossLinkSection';
import FeatureGridSection from '@/components/marketing/sections/FeatureGridSection';
import HeroSection from '@/components/marketing/sections/HeroSection';
import MarketingCtaSection from '@/components/marketing/sections/MarketingCtaSection';
import MessageGroupsSection from '@/components/marketing/sections/MessageGroupsSection';
import PainPointsSection from '@/components/marketing/sections/PainPointsSection';
import PlannerComparisonSection from '@/components/marketing/sections/PlannerComparisonSection';
import ProseSection, {
  StrategyListSection,
} from '@/components/marketing/sections/ProseSection';
import type { GradePageContent } from '@/content/marketing/types';

export default function GradePageView({ content }: { content: GradePageContent }) {
  const {
    hero,
    painPoints,
    messageGroups,
    approach,
    plannerComparison,
    features,
    strategy,
    bottomCta,
    crossLinks,
  } = content;

  return (
    <>
      <HeroSection hero={hero} />
      {painPoints ? (
        <PainPointsSection title={painPoints.title} items={painPoints.items} />
      ) : null}
      {messageGroups ? <MessageGroupsSection {...messageGroups} /> : null}
      <ProseSection
        body={approach.body}
        title={approach.title}
        footnote={approach.footnote}
      />
      {plannerComparison ? (
        <PlannerComparisonSection {...plannerComparison} />
      ) : null}
      <FeatureGridSection title={features.title} items={features.items} />
      {strategy?.items ? (
        <StrategyListSection title={strategy.title} items={strategy.items} />
      ) : strategy?.body ? (
        <ProseSection
          title={strategy.title}
          body={strategy.body}
          footnote={strategy.footnote}
        />
      ) : null}
      <MarketingCtaSection {...bottomCta} />
      <CrossLinkSection items={crossLinks} />
    </>
  );
}
