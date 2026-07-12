import { GRADE_CARDS, HOME_FEATURES, HOME_KEY_FEATURES_SHOWCASE } from './common';
import { HOME_FAQ, HOME_PROCESS } from './home-faq';
import { MARKETING_DEDICATED_DEVICE } from './marketing-dedicated-device';
import { HOME_PC_MOBILE_SHOWCASE } from './home-pc-mobile-showcase';
import { HOME_PLANNER_COMPARISON } from './home-planner-comparison';
import { HOME_STUDY_PLANNER_STORY } from './home-study-planner-story';
import type { PageSeo } from './types';

export const homeSeo: PageSeo = {
  title: 'SHOW ME THE PLAN — 분량 중심 학습 계획·실행 관리',
  description:
    'NEIS 시간표 연동, 시험·방학·평소 주차별 계획, TODO 실행·통계. 학부모 매니저 연동. 초·중·고 학습 관리 앱.',
};

export const homeContent = {
  hero: {
    headline: "계획을 플레이하는 순간,\n공부는 퀘스트가 된다.",
    subcopy:
      "학교 생활에 맞춘 학습 계획부터 실행·기록·통계까지\nSHOW ME THE PLAN(쇼미플) 은 \n초·중·고 학생과 학부모(매니저)가 함께 쓰는 학습 관리 앱입니다.",
    primaryCta: { label: "무료로 시작하기", href: "/signup" },
    appPreview: true,
  },
  studyPlannerStory: HOME_STUDY_PLANNER_STORY,
  keyFeaturesShowcase: {
    eyebrow: 'SHOW ME THE PLAN | 쇼미플',
    title: '계획 세우다 지치는 피로를 0%로 만듭니다',
    items: HOME_KEY_FEATURES_SHOWCASE,
  },
  plannerComparison: HOME_PLANNER_COMPARISON,
  pcMobileShowcase: HOME_PC_MOBILE_SHOWCASE,
  featuresTitle: "필요한 것, 하나의 앱 안에",
  features: HOME_FEATURES.map((f) => ({
    title: f.title,
    description: f.description,
  })),
  gradesTitle: "우리 학년에 맞는 이야기",
  grades: GRADE_CARDS,
  dedicatedDevice: MARKETING_DEDICATED_DEVICE,
  process: HOME_PROCESS,
  faq: HOME_FAQ,
};
