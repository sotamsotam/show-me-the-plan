import { CROSS_LINKS } from './common';
import type { GradePageContent } from './types';

export const middleContent: GradePageContent = {
  seo: {
    title: '중학생 내신·시험 대비 — Show Me The Plan',
    description:
      '시험 2~4주 역산형 주차 계획, 3모드, 과목별 통계. NEIS 시간표·학원 일정 통합.',
  },
  hero: {
    headline: '벼락치기는 이제 안녕!\n시험 2~4주 전부터 시작하는 역산형 주차 계획.',
    subcopy:
      '과목은 5~7개로 늘고, 시험 주기는 짧아집니다.\nShow Me The Plan으로 시험 D-day부터 거꾸로 세운 미션을, 매일 TODO로 실행하세요.\n14일 무료 체험 · 월 4,900원(VAT 포함)',
    primaryCta: { label: '중학생으로 시작하기', href: '/signup', variant: 'primary' },
  },
  painPoints: {
    title: '이 학령의 고민',
    items: [
      { title: '과목이 늘어나 뭐부터 해야 할지 모르겠다', description: '' },
      { title: '시험 2~3주 전부터 벼락치기 패턴 반복', description: '' },
      { title: '학교·학원·자습 시간 합치면 계획표가 너무 복잡', description: '' },
      { title: '시험 끝나면 리듬이 끊기고 다음 시험까지 방치', description: '' },
    ],
  },
  approach: {
    body: '중학교는 의무감이 생기기 시작하는 시기입니다. 스스로 계획하고, 지키고, 성취감을 느끼는 경험이 중요합니다. 시험 준비 / 평소 / 방학 3모드로 상황에 맞게 계획을 전환하세요.',
  },
  features: {
    title: '특화 기능',
    items: [
      {
        title: '역산형 시험 대비 계획',
        description: '시험 기간 설정 → 주차별·과목별 분량 계획',
      },
      {
        title: '3모드 전환',
        description: '시험 준비 / 평소 / 방학 — 유연한 계획 전환',
      },
      {
        title: '과목·교재 태그',
        description: '교과서·참고서·프린트 등 출처별 과목 관리',
      },
      {
        title: '지난 시험 복기',
        description: '공부현황·통계로 이번 시험 기간 실행 분석 → 다음 계획 수정',
      },
      {
        title: 'NEIS + 학원 스케줄',
        description: '학교 시간표와 자습·학원 일정 통합',
      },
    ],
  },
  strategy: {
    title: '전략',
    items: [
      '벼락치기 → 역산형 루틴 전환',
      '분량 미션으로 "오늘 뭐 했는지" 명확히',
      '시험 후 통계 복기 → 다음 시험 계획 개선',
    ],
  },
  bottomCta: {
    headline: '흩어진 공부를 하나의 흐름으로.',
    primaryCta: { label: '중학생으로 시작하기', href: '/signup', variant: 'primary' },
  },
  crossLinks: CROSS_LINKS.middle,
};
