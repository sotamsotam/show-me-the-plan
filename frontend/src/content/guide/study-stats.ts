import type { GuideContent } from './types';

export const STUDY_STATS_GUIDE: GuideContent = {
  intro: {
    title: '공부통계',
    description:
      '선택한 기간의 공부 계획과 실행 데이터를 요약·비교·분석하여 학습 패턴을 파악하는 방법을 안내합니다.',
  },
  steps: [],
  sections: [
    {
      title: '조회 기간 선택',
      icon: 'period-range',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '상단 조회 구간에서 통계를 볼 기간을 선택합니다.',
        },
        {
          type: 'text',
          content:
            '평소기간, 시험기간, 방학기간 등 설정된 구간을 빠르게 선택하거나, 시작일·종료일을 직접 입력할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '선택한 구간이 아직 시작되지 않았거나 공부 기록이 없으면 통계가 표시되지 않을 수 있습니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '요약 지표 · 기간 비교',
      icon: 'stats-cards',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '상단 요약 카드에서 건수 달성률, 시간 달성률, 공부한 날, 목표 달성일, 연속 달성일 등 핵심 지표를 한눈에 확인합니다.',
        },
        {
          type: 'text',
          content:
            '이전 구간 대비 섹션에서는 직전 시험기간·방학기간 등과 실행 시간·달성률 변화를 비교할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '남은 계획 카드에서는 기간 종료일 이후 남아 있는 공부 계획 분량도 함께 확인할 수 있습니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '패턴 · 추세 차트',
      icon: 'stats-trend',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '요일별·주차별 패턴 차트로 어느 요일·어느 주에 공부가 집중되는지 확인합니다.',
        },
        {
          type: 'text',
          content:
            '일별 실행 시간·달성률 추세 차트로 기간 동안의 공부 흐름을 살펴볼 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '과목별 계획·실행 비교, 과목 불균형 하이라이트, 과목별 품질 차트로 과목 간 밸런스를 점검합니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '실행 분석 · 개선 포인트',
      icon: 'stats-insight',
      paragraphs: [
        '자주 미달성 TODO 목록에서 반복적으로 놓치는 공부 항목을 확인합니다.',
        '실행 시간 편차 분석으로 계획 대비 실제 공부 시작·종료 시각의 차이를 살펴볼 수 있습니다.',
        '실행 상태 분포, 성취도 요약, 직접입력·타이머 입력 비율로 기록 습관을 점검합니다.',
        '하단 전체 비교 차트에서 선택 기간의 계획 시간과 실행 시간을 과목별·전체로 비교합니다.',
        'TODO에서 실행 기록을 꾸준히 남길수록 통계가 더 풍부하고 정확해집니다.',
      ],
    },
  ],
};
