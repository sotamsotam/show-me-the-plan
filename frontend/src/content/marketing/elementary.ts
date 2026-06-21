import { CROSS_LINKS } from './common';
import type { GradePageContent } from './types';

export const elementaryContent: GradePageContent = {
  seo: {
    title: '초등학생 공부 습관 — Show Me The Plan',
    description:
      'NEIS 시간표, 방학 주차 계획, 분량 TODO. 부모 매니저와 함께 칭찬·격려하는 학습 관리.',
  },
  hero: {
    headline: "공부습관을 만드는 황금시기\n 놓치지 말고 시작하세요.",
    subcopy:
      '초등 공부의 시작은 거창한 입시 전략이 아닙니다.\n숙제·예습·독서를 약속처럼 지키는 습관, 그리고 부모와 함께 보는 루틴입니다.\n14일 무료 체험 · 월 4,900원(VAT 포함)',
    primaryCta: { label: '초등학생으로 시작하기', href: '/signup', variant: 'primary' },
    secondaryCta: { label: '학부모용', href: '/for-parents', variant: 'secondary' },
  },
  painPoints: {
    title: '이 학령의 고민',
    items: [
      { title: '플래너를 써도 며칠이면 그만둔다', description: '' },
      { title: '학교 숙제·학원·독서 시간을 한눈에 정리하기 어렵다', description: '' },
      { title: '"공부했니?"가 매일 잔소리로 느껴진다', description: '' },
      { title: '방학이 되면 공부 리듬이 완전히 깨진다', description: '' },
    ],
  },
  approach: {
    body: '초등학생에게는 복잡한 통계보다, 오늘 할 일을 끝내는 경험이 중요합니다. NEIS 시간표에 맞춰 학교 수업 → 자습 → 학원 시간을 시각적으로 배치하고, 방학 주차별 계획으로 무너지지 않는 생활 리듬을 만듭니다.',
  },
  features: {
    title: '특화 기능',
    items: [
      {
        title: '학교·자습·학원 시간 시각화',
        description: 'NEIS 시간표 + 스터디 플랜을 캘린더에서 함께 확인',
      },
      {
        title: '방학 루틴 유지',
        description: '여름·겨울 방학 주차별 계획으로 습관 이어가기',
      },
      {
        title: '분량 중심 TODO',
        description: '"독서 30분", "수학 익힘 5쪽"처럼 끝낼 수 있는 미션',
      },
      {
        title: '매니저(부모) 연동',
        description: '계획·실행을 함께 보며 칭찬과 격려의 도구로 활용',
      },
    ],
  },
  strategy: {
    title: '부모와 아이가 함께 쓰는 공부 도구',
    items: [
      '아이: 오늘 TODO 확인 → 완료 체크',
      '부모(매니저): 이번 주 달성률 확인 → "3개 중 2개 했네, 내일 하나 더!"',
      '잔소리 대신, 구체적 칭찬',
    ],
  },
  bottomCta: {
    headline: '우리 아이의 첫 공부 습관, 함께 시작해 보세요.',
    primaryCta: { label: '초등학생으로 시작하기', href: '/signup', variant: 'primary' },
  },
  crossLinks: CROSS_LINKS.elementary,
};
