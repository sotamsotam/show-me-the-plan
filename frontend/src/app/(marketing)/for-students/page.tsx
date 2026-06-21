import LandingPageView from '@/components/marketing/LandingPageView';
import { forStudentsContent, forStudentsElementaryNote } from '@/content/marketing';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: forStudentsContent.seo.title,
  description: forStudentsContent.seo.description,
};

export default function ForStudentsPage() {
  return (
    <LandingPageView
      {...forStudentsContent}
      elementaryNote={forStudentsElementaryNote}
    />
  );
}
