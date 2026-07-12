export type MarketingLink = {
  label: string;
  href: string;
};

export type MarketingCta = {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
};

export type ValueCard = {
  title: string;
  description: string;
};

export type FeatureItem = {
  title: string;
  description: string;
};

export type KeyFeatureShowcaseScreen = {
  src: string;
  alt: string;
  device: 'mobile' | 'desktop';
  type?: 'image' | 'video';
};

export type KeyFeatureShowcaseContent = {
  eyebrow?: string;
  title?: string;
  items: readonly KeyFeatureShowcaseItem[];
};

export type KeyFeatureShowcaseItem = {
  title: string;
  titleAccent: string;
  description: string;
  detailLabel?: string;
  detailHref?: string;
  icon?: 'calendar' | 'checklist' | 'timetable' | 'timeline' | 'chart' | 'users';
  screen: KeyFeatureShowcaseScreen;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type ProcessStep = {
  title: string;
  description: string;
};

export type PainPoint = {
  title: string;
  description: string;
};

export type MessageBlock = {
  keyword: string;
  body: string;
};

export type MessageQuote = {
  body: string;
};

export type MessageGroup = {
  title: string;
  items: MessageQuote[];
};

export type MessageGroupsContent = {
  eyebrow?: string;
  title?: string;
  groups: MessageGroup[];
};

export type GradeCard = {
  title: string;
  subtitle?: string;
  description: string | string[];
  href: string;
};

export type TargetCard = {
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
};

export type CrossLinkCard = {
  label: string;
  href: string;
};

export type PageSeo = {
  title: string;
  description: string;
};

export type HeroImage = {
  src: string;
  alt: string;
};

export type HeroContent = {
  headline: string;
  subcopy: string;
  primaryCta?: MarketingCta;
  secondaryCta?: MarketingCta;
  image?: HeroImage;
  /** 여러 장이면 페이드 전환으로 순환 표시 */
  images?: HeroImage[];
  /** CSS 앱 UI 목업 (홈 등) */
  appPreview?: boolean;
};

export type SectionWithTitle<T> = {
  title: string;
  eyebrow?: string;
  items: T[];
};

export type BottomCtaContent = {
  headline: string;
  subcopy?: string;
  primaryCta: MarketingCta;
  secondaryCta?: MarketingCta;
};

export type GradePageContent = {
  seo: PageSeo;
  hero: HeroContent;
  painPoints?: SectionWithTitle<PainPoint>;
  messageGroups?: MessageGroupsContent;
  approach: {
    title?: string;
    body: string;
    footnote?: string;
  };
  plannerComparison?: PlannerComparisonContent;
  features: SectionWithTitle<FeatureItem>;
  strategy?: {
    title: string;
    items?: string[];
    body?: string;
    footnote?: string;
  };
  bottomCta: BottomCtaContent;
  crossLinks: CrossLinkCard[];
};

export type VideoInsightCase = {
  name: string;
  subtitle?: string;
  summary: string;
  highlights?: string[];
};

export type VideoInsightContent = {
  title: string;
  youtube: {
    videoId: string;
    startSeconds: number;
    title?: string;
  };
  source: string;
  insight: {
    title: string;
    body: string;
    highlights?: string[];
    cases?: VideoInsightCase[];
  };
};

export type KioskModeParagraph = {
  text: string;
  highlights?: string[];
};

export type KioskModeContent = {
  eyebrow?: string;
  title: string;
  paragraphs: readonly (string | KioskModeParagraph)[];
  youtube: {
    videoId: string;
    title?: string;
  };
};

export type PlannerComparisonItem = {
  title: string;
  paper: string;
  smtp: string;
};

export type PlannerComparisonRow = {
  paper: string;
  smtp: string;
};

export type PlannerComparisonContent = {
  title: string;
  items: PlannerComparisonItem[];
  summaryRows: PlannerComparisonRow[];
  tagline: string;
  subtagline?: string;
};

export type DedicatedDeviceContent = {
  title: string;
  headline: string;
  description: string;
  youtube?: {
    videoId: string;
    title?: string;
  };
};

export type StudyPlannerStoryPainPoint = {
  quote: string;
  reason: string;
};

export type StudyPlannerStoryContent = {
  hookLead: string;
  hookTitle: string;
  question: string;
  painPoints: StudyPlannerStoryPainPoint[];
  resolutionTitle: string;
  resolutionBody: string;
};

export type PcMobileShowcaseFeature = {
  title: string;
  points?: string[];
};

export type PcMobileShowcaseScreen = {
  pc: { src: string; alt: string };
  mobile: { src: string; alt: string; type?: 'image' | 'video' };
};

export type PcMobileShowcaseContent = {
  title: string;
  lead: string;
  cardHeadline: string;
  features: PcMobileShowcaseFeature[];
  screen: PcMobileShowcaseScreen;
};

export type LandingPageContent = {
  seo: PageSeo;
  hero: HeroContent;
  painPoints?: SectionWithTitle<PainPoint>;
  videoInsight?: VideoInsightContent;
  messages?: SectionWithTitle<MessageBlock>;
  messageGroups?: MessageGroupsContent;
  plannerComparison?: PlannerComparisonContent;
  features?: SectionWithTitle<FeatureItem>;
  dedicatedDevice?: DedicatedDeviceContent;
  grades?: SectionWithTitle<GradeCard>;
  bottomCta: BottomCtaContent;
  crossLinks?: CrossLinkCard[];
};
