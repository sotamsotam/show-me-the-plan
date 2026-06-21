import GradePageView from '@/components/marketing/GradePageView';
import { middleContent } from '@/content/marketing';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: middleContent.seo.title,
  description: middleContent.seo.description,
};

export default function MiddlePage() {
  return <GradePageView content={middleContent} />;
}
