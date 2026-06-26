import type { GuideContent } from '@/content/guide/types';

export const MANAGER_STUDENTS_GUIDE: GuideContent = {
  intro: {
    title: '학생별 관리',
    description:
      '연결된 학생을 확인하고, 학생을 선택한 뒤 스케줄·공부 계획·TODO 등을 대신 살펴보는 방법을 안내합니다.',
  },
  steps: [],
  sections: [
    {
      title: '연결된 학생 확인',
      icon: 'manager-team',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '학생별 관리 화면에서 매니저로 연결된 학생 목록을 확인할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '학생이 내정보 수정에서 매니저로 설정하면 이 목록에 자동으로 표시됩니다. 아직 연결된 학생이 없다면 학생에게 매니저 등록을 요청하세요.',
        },
        {
          type: 'text',
          content:
            '각 학생의 이름, 이메일, 학교 정보, 구독 상태를 한눈에 볼 수 있습니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '학생 선택하기',
      icon: 'account-profile',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '목록에서 학생의 선택 버튼을 누르면 해당 학생이 현재 관리 대상으로 지정됩니다.',
        },
        {
          type: 'text',
          content:
            '학생을 선택하면 화면 상단 학생 선택기에도 반영되며, 이후 스케줄·스터디 플랜·TODO·공부통계·설정 메뉴에서 그 학생의 데이터를 확인할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '다른 학생을 관리하려면 학생별 관리 화면이나 상단 학생 선택기에서 다시 선택하세요.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '학생 화면 바로가기',
      icon: 'todo-list',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '학생을 선택한 뒤 스케줄, 스터디 플랜, 공부현황, TODO, 공부통계, 설정, 사용법 버튼을 누르면 해당 학생의 화면으로 바로 이동합니다.',
        },
        {
          type: 'text',
          content:
            '학생의 공부 계획을 점검하거나, TODO 실행 기록을 확인하고, 설정을 함께 살펴볼 때 활용하세요.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '구독 상태 확인',
      icon: 'billing-card',
      paragraphs: [
        '학생의 구독이 만료되었거나 이용이 제한된 경우, 구독 배지로 상태를 확인할 수 있습니다.',
        '이용이 제한된 학생은 상세 화면 바로가기가 비활성화될 수 있습니다.',
      ],
    },
  ],
};
