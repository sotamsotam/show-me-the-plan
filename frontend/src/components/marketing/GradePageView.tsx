import CrossLinkSection from '@/components/marketing/sections/CrossLinkSection';
import FeatureGridSection from '@/components/marketing/sections/FeatureGridSection';
import HeroSection from '@/components/marketing/sections/HeroSection';
import MarketingCtaSection from '@/components/marketing/sections/MarketingCtaSection';
import PainPointsSection from '@/components/marketing/sections/PainPointsSection';
import ProseSection, {
  StrategyListSection,
} from '@/components/marketing/sections/ProseSection';
import type { GradePageContent } from '@/content/marketing/types';

export default function GradePageView({ content }: { content: GradePageContent }) {
  const { hero, painPoints, approach, features, strategy, bottomCta, crossLinks } =
    content;

  return (
    <>
      <HeroSection hero={hero} />
      <PainPointsSection title={painPoints.title} items={painPoints.items} />
      <ProseSection body={approach.body} title={approach.title} />
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
