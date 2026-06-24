import StudyPlannerStorySequence from '@/components/marketing/StudyPlannerStorySequence';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { StudyPlannerStoryContent } from '@/content/marketing/types';

export default function StudyPlannerStorySection(props: StudyPlannerStoryContent) {
  return (
    <MarketingSection variant="warm" className="overflow-hidden">
      <StudyPlannerStorySequence {...props} />
    </MarketingSection>
  );
}
