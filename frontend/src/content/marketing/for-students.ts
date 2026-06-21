import type { LandingPageContent } from './types';

export const forStudentsContent: LandingPageContent = {
  seo: {
    title: '중·고등학생 학습 계획 — Show Me The Plan',
    description:
      '분량 중심 TODO, 시험 역산형 주차 계획. 미션 클리어하면 죄책감 없는 휴식. NEIS 시간표 연동.',
  },
  hero: {
    headline: '계획을 끝내면 완전한 자유!\n공부를 퀘스트처럼 플레이하고, 죄책감 없는 휴식을 즐겨라.',
    subcopy:
      '"2시간 앉아 있기"는 그만.\n정해진 분량을 끝내면 그날 미션 클리어 — 게임·친구·휴식, 마음 편히 즐기세요.\n14일 무료 체험 · 월 4,900원(VAT 포함)',
    primaryCta: { label: '14일 무료 체험 시작', href: '/signup', variant: 'primary' },
    secondaryCta: { label: '학부모용', href: '/for-parents', variant: 'secondary' },
  },
  painPoints: {
    title: "혹시 '불행한 수험생' 모드인가요?",
    items: [
      {
        title: '공부할 땐 놀고 싶고, 놀 땐 공부 걱정',
        description: '죄책감 있는 휴식만 반복',
      },
      {
        title: '계획은 거창한데 매번 작심삼일',
        description: '"오늘 5시간" 같은 시간 중심 계획의 함정',
      },
      {
        title: '전교 1등은 뭔가 다른 것 같다',
        description: '집중력·루틴의 비결이 궁금하다',
      },
    ],
  },
  messages: {
    title: '시간은 흐르지만, 분량은 해치우는 것',
    items: [
      {
        keyword: '분량 = 자유',
        body: '엉덩이로 버티는 공부는 그만. "교과서 1~3단원 1회독"을 끝내면 오늘 미션 완료 — 바로 쉬어도 OK.',
      },
      {
        keyword: '내 손 안의 공부 내비게이션',
        body: '막연한 불안을 확신으로. 주차별·일별 명확한 미션이 있으면, 뇌는 집중 모드로 전환됩니다.',
      },
    ],
  },
  features: {
    title: '공부를 퀘스트로 만드는 기능',
    items: [
      {
        title: '미션 클리어 = 성취감',
        description: '주차 계획의 분량이 오늘 TODO로 연결. 완료 버튼을 누를 때마다 쌓이는 기록',
      },
      {
        title: '타임라인으로 남는 실행',
        description: '언제, 어떤 과목, 얼마나 — 오늘 한 일이 눈에 보임',
      },
      {
        title: '시험 역산형 계획',
        description: 'D-day부터 거꾸로 세운 주차별·과목별 미션',
      },
      {
        title: '숫자로 보는 나',
        description: '과목별 시간·달성률. 다음 주 계획 수정 근거',
      },
    ],
  },
  grades: {
    title: '학년별로 더 알아보기',
    items: [
      {
        title: '중등',
        description: '벼락치기 NO, 역산형 내신 전략',
        href: '/middle',
      },
      {
        title: '고등',
        description: '데이터로 입시 설계',
        href: '/high',
      },
    ],
  },
  bottomCta: {
    headline: '오늘의 미션을 끝내고, 죄책감 없이 쉬세요.',
    primaryCta: { label: '무료로 시작하기', href: '/signup', variant: 'primary' },
  },
};

export const forStudentsElementaryNote =
  '초등학생은 초등 페이지를 확인하세요.';
