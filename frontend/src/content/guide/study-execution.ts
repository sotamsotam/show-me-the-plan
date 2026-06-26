import type { GuideContent } from './types';

export const STUDY_EXECUTION_GUIDE: GuideContent = {
  intro: {
    title: '공부현황',
    description:
      '선택한 기간의 스터디 플랜 실행 내역을 과목별로 확인하고, 실행률과 성취도를 점검하는 방법을 안내합니다.',
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
            '상단 조회 구간에서 확인할 기간을 선택합니다.',
        },
        {
          type: 'text',
          content:
            '평소기간, 시험기간, 방학기간 등 설정된 구간을 빠르게 선택하거나, 시작일·종료일을 직접 입력할 수 있습니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '과목별 실행 내역 확인',
      icon: 'execution-table',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '선택한 기간의 스터디 플랜 실행 내역이 과목별로 표시됩니다.',
        },
        {
          type: 'text',
          content:
            '과목, 내역, 실행여부, 실행률, 성취도, 실행일 열로 각 공부 계획의 기록을 한눈에 확인할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '내역·성취도·실행일 열 제목을 눌러 오름차순·내림차순으로 정렬할 수 있습니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '실행률 · 성취도 읽는 법',
      icon: 'execution-metrics',
      paragraphs: [
        '실행여부는 TODO에서 기록한 완료 상태를 보여 줍니다. 체크 표시로 실행완료·부분완료·미완료 여부를 확인할 수 있습니다.',
        '실행률은 계획한 공부 시간 대비 실제 공부한 시간 비율입니다.',
        '성취도는 TODO 실행 기록 시 입력한 1~10 점수를 바탕으로 표시됩니다.',
        'TODO에서 실행 기록을 꾸준히 남길수록 공부현황이 더 정확하게 채워집니다.',
      ],
    },
  ],
};
