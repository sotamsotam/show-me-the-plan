import { GRADE_CARDS, HOME_FEATURES, HOME_TARGET_CARDS } from './common';
import { HOME_FAQ, HOME_PROCESS } from './home-faq';
import type { PageSeo } from './types';

export const homeSeo: PageSeo = {
  title: 'Show Me The Plan — 분량 중심 학습 계획·실행 관리',
  description:
    'NEIS 시간표 연동, 시험·방학·평소 주차별 계획, TODO 실행·통계. 학부모 매니저 연동. 초·중·고 학습 관리 앱.',
};

export const homeContent = {
  hero: {
    headline: '계획을 플레이하는 순간,\n공부는 퀘스트가 된다.',
    subcopy:
      '학교 생활에 맞춘 학습 계획부터 실행·기록·통계까지, 한곳에서.\nShow Me The Plan은 초·중·고 학생과 학부모(매니저)가 함께 쓰는 학습 관리 앱입니다.',
    primaryCta: { label: '무료로 시작하기', href: '/signup' },
    secondaryCta: {
      label: '학부모용 보기',
      href: '/for-parents',
      variant: 'secondary' as const,
    },
    appPreview: true,
  },
  targetCards: HOME_TARGET_CARDS,
  valuesTitle: 'Show Me The Plan이 지향하는 공부',
  featuresTitle: '필요한 것, 하나의 앱 안에',
  features: HOME_FEATURES.map((f) => ({ title: f.title, description: f.description })),
  gradesTitle: '우리 학년에 맞는 이야기',
  grades: GRADE_CARDS,
  process: HOME_PROCESS,
  faq: HOME_FAQ,
  bottomCta: {
    headline: '누구를 위한 Show Me The Plan인가요?',
    links: [
      { label: '학부모·선생님', href: '/for-parents' },
      { label: '중·고등학생', href: '/for-students' },
    ],
  },
};
