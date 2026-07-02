import type { GuideContent } from './types';

export const SCHEDULE_GUIDE: GuideContent = {
  intro: {
    title: '일상 스케줄',
    description:
      '월간·주간 일정을 입력하고, 학사 일정과 개인 일정을 함께 관리하는 방법을 안내합니다.',
  },
  steps: [],
  sections: [
    {
      title: '월간 일정 입력 방법',
      icon: 'calendar-month',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '일상 스케줄 메뉴의 기본 캘린더 모드는 주간 모드입니다. 상단 오른쪽의 월 버튼을 클릭해 주세요.',
        },
        {
          type: 'text',
          content:
            '기본적으로 학교에서 공지한 휴업일, 행사, 시험, 방학 등 학사 일정이 자동으로 나타납니다.',
        },
        {
          type: 'text',
          content:
            '여기에 수행평가, 가족 여행, 행사 등 개인적인 일정을 입력해 주세요.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
        {
          type: 'text',
          content: '월간 일정 입력 시에는 이미지를 첨부할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '수행평가 기준 프린트물 등 일정에 필요한 자료를 이미지로 업로드해 두면, 일정에서 손쉽게 다시 확인할 수 있어 편리합니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '주간 일정 입력 방법',
      icon: 'calendar-week',
      paragraphs: [],
      blocks: [
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
  ],
};
