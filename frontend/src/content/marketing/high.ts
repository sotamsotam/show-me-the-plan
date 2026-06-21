import { CROSS_LINKS } from './common';
import type { GradePageContent } from './types';

export const highContent: GradePageContent = {
  seo: {
    title: '고등학생 자기주도·입시 계획 — Show Me The Plan',
    description:
      'N회독 주차 계획, 과목별 통계, 실행 타임라인. 데이터 기반 학습 관리.',
  },
  hero: {
    headline: '감이 아닌 숫자로 입시를 설계하라.',
    subcopy:
      '5회독 반복 학습, 순공 시간 확보 —\nShow Me The Plan은 계획 → 실행 → 분석 → 수정 사이클을 돕는 자기주도 도구입니다.\n14일 무료 체험 · 월 4,900원(VAT 포함)',
    primaryCta: { label: '고등학생으로 시작하기', href: '/signup', variant: 'primary' },
  },
  painPoints: {
    title: '이 학령의 고민',
    items: [
      { title: '내신·모의고사·수능을 동시에 계획하기 어렵다', description: '' },
      { title: '계획과 실행의 gap이 크다', description: '' },
      { title: '과목별 시간·회독 수를 감으로만 안다', description: '' },
      { title: '시험 기간만 몰아치고 평소에는 리듬을 잃는다', description: '' },
    ],
  },
  approach: {
    body: '고등학생에게 필요한 건 감독이 아니라 시스템입니다. 주차별 계획에 "1회독 → 2회독 → …" 분량을 세우고, 공부통계에서 과목별 계획 대비 실행·달성률을 확인하세요.',
  },
  features: {
    title: '특화 기능',
    items: [
      {
        title: '심화 통계 분석',
        description: '과목별 계획 대비 실행 시간, 달성률, 기간별 추이 차트',
      },
      {
        title: 'N회독 계획·실행 관리',
        description: '주차별 계획에 1~5회독 분량을 세우고 TODO로 실행·기록',
      },
      {
        title: '시험 / 방학 / 평소 3모드',
        description: '내신·모의고사·방학 집중 기간 전환',
      },
      {
        title: 'Excel 템플릿',
        description: '기존 계획표를 불러와 바로 적용',
      },
      {
        title: '공부현황 상세',
        description: '순공 시간·실행 타임라인',
      },
    ],
  },
  strategy: {
    title: '최상위권 몰입 환경 구축',
    body: '평일 8시간, 주말 14시간 — 숫자는 목표 예시입니다. 중요한 건 "오늘 할 분량이 명확할 때" 집중이 유지된다는 것. Show Me The Plan은 그 분량과 실행을 데이터로 관리합니다.',
    footnote:
      '8시간/14시간은 학습 목표 가이드이며, 앱이 강제하는 수치가 아닙니다.',
  },
  bottomCta: {
    headline: '감이 아닌 데이터로, 고등 공부를 설계하세요.',
    primaryCta: { label: '고등학생으로 시작하기', href: '/signup', variant: 'primary' },
  },
  crossLinks: CROSS_LINKS.high,
};
