import type { GuideContent } from './types';

export const TIPS_GUIDE: GuideContent = {
  intro: {
    title: '편리한 사용법',
    description:
      '쇼미플을 더 편하게 사용할 수 있는 태그, 스케줄 입력, 앱 설치, 알람, 인쇄 기능을 안내합니다.',
  },
  steps: [
    {
      step: 1,
      title: '과목별 태그 설정',
      paragraphs: [
        '과목별로 사용할 교재, 공부 방법을 태그로 미리 등록해 둘 수 있습니다.',
        '이 태그를 이용하여 공부 스케줄 입력을 매우 편하게 할 수 있습니다.',
      ],
    },
    {
      step: 2,
      title: '공부 스케줄 등록',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '과목을 선택하면 입력해 둔 교재와 공부 방법 태그가 표시됩니다. 클릭으로 손쉽게 입력하고 범위만 추가로 입력하시면 됩니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
        {
          type: 'text',
          content:
            '한 번 입력된 스케줄 제목은 차후 자동으로 제안되어 더욱 쉽게 입력할 수 있습니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
  ],
  sections: [
    {
      title: '앱 설치',
      icon: 'app-install',
      paragraphs: [
        '스마트폰에서 크롬 브라우저로 접속 후 로그인하시면 앱 설치 안내가 나옵니다.',
        '앱을 설치하시면 알람 기능, 앱 고정 기능 등 다양한 기능을 활용할 수 있습니다.',
      ],
    },
    {
      title: '공부 계획시간 알람 기능',
      icon: 'alarm',
      paragraphs: [
        '계획한 공부 시간이 경과할 때까지 쇼미플 앱을 열지 않으면 공부 시간 알람이 실행됩니다.',
        '공부 시간 전에 쇼미플 앱을 실행하시면 알람은 생략됩니다.',
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
