import GradePageView from '@/components/marketing/GradePageView';
import { elementaryContent } from '@/content/marketing';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: elementaryContent.seo.title,
  description: elementaryContent.seo.description,
};

export default function ElementaryPage() {
  return <GradePageView content={elementaryContent} />;
}
