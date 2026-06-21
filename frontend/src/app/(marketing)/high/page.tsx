import GradePageView from '@/components/marketing/GradePageView';
import { highContent } from '@/content/marketing';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: highContent.seo.title,
  description: highContent.seo.description,
};

export default function HighPage() {
  return <GradePageView content={highContent} />;
}
