import type { GuideContent } from './types';

export const ACCOUNT_SETTINGS_GUIDE: GuideContent = {
  intro: {
    title: '내정보관리',
    description:
      '내정보 수정 화면에서 계정, 학교, 과목, 알림, 매니저, 구독 등을 관리하는 방법을 안내합니다. 상단 또는 하단 메뉴의 내정보 수정에서 접근할 수 있습니다.',
  },
  steps: [],
  sections: [
    {
      title: '계정 · 학교 정보',
      icon: 'account-profile',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '내정보 수정에서 사용자명과 이메일을 확인할 수 있습니다. 이 항목은 변경할 수 없습니다.',
        },
        {
          type: 'text',
          content:
            'NEIS 연동 학생(초·중·고)은 학교 구분, 학교 검색, 학년, 반을 수정할 수 있습니다. 학교 정보를 바꾸면 학교 시간표와 학사 일정 연동이 갱신됩니다.',
        },
        {
          type: 'text',
          content:
            '기타학생 계정은 학교 시간표 연동 없이 과목과 일정을 직접 설정합니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '내 과목 관리',
      icon: 'subjects-book',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '내 과목 섹션에서 공부하는 과목 목록을 등록·수정합니다.',
        },
        {
          type: 'text',
          content:
            '등록한 과목은 공부 스케줄, TODO, 공부현황, 공부통계에서 과목별로 표시되는 기준이 됩니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '비밀번호 · 알림 설정',
      icon: 'password-lock',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '비밀번호 변경에서 현재 비밀번호 확인 후 새 비밀번호를 설정할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '알림 설정에서 공부 시간 알림(푸시 알림)을 켜거나 끌 수 있습니다. 앱 설치 후 사용하면 더 안정적으로 알림을 받을 수 있습니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '매니저 연결',
      icon: 'manager-team',
      paragraphs: [
        '학생은 담당 매니저(학부모·선생님)를 이름 또는 이메일로 검색해 추가할 수 있습니다.',
        '매니저는 연결된 학생의 공부 현황을 함께 확인할 수 있습니다.',
        '담당 매니저는 여러 명 지정할 수 있으며, 개별적으로 해제할 수도 있습니다.',
      ],
    },
    {
      title: '구독 · 결제 · 회원 탈퇴',
      icon: 'billing-card',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '구독 · 결제 영역에서 현재 이용 상태와 포인트를 확인하고, 구독 신청·구독 관리 페이지로 이동할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '구독 관리 페이지에서 결제 내역 조회, 구독 해지 예약, 해지 예약 취소를 할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '회원 탈퇴는 내정보 수정 하단에서 신청할 수 있습니다. 탈퇴 시 계정과 데이터가 삭제되므로 신중하게 진행해 주세요.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
  ],
};
