import type { GuideContent } from './types';

export const STUDY_PLAN_GUIDE: GuideContent = {
  intro: {
    title: '공부 스케줄',
    description:
      '공부 스케줄 입력 방법과 월간·주간 일정 인쇄 기능을 안내합니다.',
  },
  steps: [],
  sections: [
    {
      title: '주간 일정 입력 방법',
      icon: 'calendar-week',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '공부 스케줄에서는 월간 스케줄 모드에서 스케줄 확인만 가능합니다.',
        },
        {
          type: 'text',
          content:
            '입력은 주간 스케줄 모드와 일간 스케줄 모드에서 가능합니다.',
        },
        {
          type: 'text',
          content:
            '입력할 시간 구간을 선택한 후 단일 일정·반복 일정으로 입력할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '입력된 단일 일정은 선택 후 리사이즈하거나 드래그해서 시간과 날짜를 손쉽게 수정할 수 있습니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
        {
          type: 'text',
          content:
            '반복 일정은 클릭하면 반복 일정 전체를 수정할지, 선택한 날 일정만 수정할지를 선택한 뒤 수정할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '선택한 날 일정만 수정한 뒤 다른 날짜로 옮기면, 그 날은 반복 일정에서 빠지고 단일 일정으로 저장됩니다. 캘린더 드래그 또는 수정 창에서 날짜를 바꿀 수 있습니다. 같은 날에 반복 일정과 단일 일정이 함께 있어도 됩니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '월간, 주간 스케줄 인쇄 기능',
      icon: 'print',
      paragraphs: [
        '월간, 주간 스케줄을 인쇄하여 휴대하거나 붙여놓고 리마인드하세요.',
        '스마트폰 사용이 어려울 때 인쇄된 스케줄표에 체크하고, 가능한 시간에 공부 시간을 입력하세요.',
      ],
    },
  ],
};
