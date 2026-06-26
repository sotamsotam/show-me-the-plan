import type { GuideContent } from '@/content/guide/types';

export const MANAGER_OVERVIEW_GUIDE: GuideContent = {
  intro: {
    title: '학생별 공부현황',
    description:
      '연결된 학생들의 하루 TODO 실행 현황을 한눈에 비교하고, 상세 내용을 확인하는 방법을 안내합니다.',
  },
  steps: [],
  sections: [
    {
      title: '날짜 선택',
      icon: 'calendar-week',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '상단 날짜 영역에서 좌우 화살표로 확인할 날짜를 바꿀 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '오늘이 아닌 날짜를 보고 있다면 오늘로 이동 버튼으로 빠르게 돌아올 수 있습니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '학생별 실행 현황 비교',
      icon: 'execution-metrics',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '표에서 연결된 모든 학생의 TODO 건수, 실행 건수, 건수 실행률, 시간 실행률을 한눈에 비교할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '건수 실행률은 계획한 TODO 중 실행 완료·부분완료한 비율이고, 시간 실행률은 계획 시간 대비 실제 공부 시간 비율입니다.',
        },
        {
          type: 'text',
          content:
            '여러 학생을 동시에 관리할 때, 누가 오늘 계획을 잘 지키고 있는지 빠르게 파악하는 데 활용하세요.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '학생별 상세 보기',
      icon: 'execution-table',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '각 학생 행의 선택 버튼을 누르면 해당 날짜의 TODO 상세 목록이 펼쳐집니다.',
        },
        {
          type: 'text',
          content:
            '과목별로 정리된 계획 항목과 실행 상태를 확인하고, 학생의 하루 공부 내용을 구체적으로 점검할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '다시 선택 버튼을 누르면 상세 영역을 닫을 수 있습니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '확인 도장 남기기',
      icon: 'todo-edit',
      paragraphs: [
        '상세 보기에서 학생의 TODO 실행 내용을 확인한 뒤, 확인 도장을 남길 수 있습니다.',
        '도장을 남기면 학생 TODO 화면에도 표시되어, 매니저가 확인했음을 학생에게 알릴 수 있습니다.',
      ],
    },
  ],
};
