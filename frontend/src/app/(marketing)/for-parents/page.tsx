import LandingPageView from '@/components/marketing/LandingPageView';
import { forParentsContent } from '@/content/marketing';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: forParentsContent.seo.title,
  description: forParentsContent.seo.description,
};

export default function ForParentsPage() {
  return <LandingPageView {...forParentsContent} />;
}
