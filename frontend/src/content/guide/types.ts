export type GuideSubItem = {
  title: string;
  description: string;
};

export type GuideSubSection = {
  stepLabel: string;
  title: string;
  items: GuideSubItem[];
  youtube?: GuideYoutubeEmbed;
};

export type GuideLink = {
  label: string;
  href?: string;
  pending?: boolean;
};

export type GuideStepBlock =
  | { type: 'text'; content: string }
  | { type: 'screenshot'; label?: string };

export type GuideYoutubeEmbed = {
  videoId: string;
  title?: string;
  startSeconds?: number;
};

export type GuideStep = {
  step: number;
  title: string;
  paragraphs: string[];
  blocks?: GuideStepBlock[];
  subSections?: GuideSubSection[];
  links?: GuideLink[];
  youtube?: GuideYoutubeEmbed;
};

export type GuideSectionIconName =
  | 'app-install'
  | 'alarm'
  | 'print'
  | 'calendar-month'
  | 'calendar-week'
  | 'todo-list'
  | 'timer'
  | 'timeline-progress'
  | 'todo-edit'
  | 'period-range'
  | 'execution-table'
  | 'execution-metrics'
  | 'stats-cards'
  | 'stats-trend'
  | 'stats-insight'
  | 'account-profile'
  | 'subjects-book'
  | 'password-lock'
  | 'manager-team'
  | 'billing-card';

export type GuideSection = {
  title: string;
  icon: GuideSectionIconName;
  paragraphs: string[];
  blocks?: GuideStepBlock[];
  links?: GuideLink[];
};

export type GuideTip = {
  title: string;
  paragraphs: string[];
  youtube?: GuideYoutubeEmbed;
};

export type GuideIntro = {
  title: string;
  description: string;
};

export type GuideContent = {
  intro: GuideIntro;
  steps: GuideStep[];
  sections?: GuideSection[];
  tips?: GuideTip[];
};
