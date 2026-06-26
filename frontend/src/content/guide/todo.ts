import type { GuideContent } from './types';

export const TODO_GUIDE: GuideContent = {
  intro: {
    title: 'TODO',
    description:
      '공부 스케줄에 등록한 계획을 확인하고, 실행 기록을 남기며 하루 공부 현황을 점검하는 방법을 안내합니다.',
  },
  steps: [],
  sections: [
    {
      title: '오늘 할 일 목록 확인',
      icon: 'todo-list',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '공부 스케줄에 입력한 계획이 TODO에 자동으로 표시됩니다.',
        },
        {
          type: 'text',
          content:
            '상단 주간 날짜 버튼으로 날짜를 바꿔 그날의 공부 계획을 확인할 수 있습니다. 시험 대비 기간에는 D-DAY도 함께 표시됩니다.',
        },
        {
          type: 'text',
          content:
            '과목별·시간순 정렬 버튼으로 목록 보기 방식을 바꿀 수 있습니다. 각 항목에는 과목, 제목, 계획 시간이 표시됩니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '실행 기록 입력',
      icon: 'timer',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '공부할 항목을 탭하거나, 스와이프 후 기록을 눌러 실행 화면을 엽니다.',
        },
        {
          type: 'text',
          content:
            '직접입력으로 시행 시작·종료 시간을 입력하거나, 타이머입력으로 실제 공부 시간을 측정할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '실행완료, 부분완료, 미완료 중 상태를 선택해 저장합니다. 부분완료·실행완료일 때는 성취도(1~10)도 함께 기록할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '미리 공부 범위를 정하지 못했다면 제목을 수정해, 실제로 공부한 내용으로 바꿀 수 있습니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '시간 달성률 · 하루 타임라인',
      icon: 'timeline-progress',
      paragraphs: [],
      blocks: [
        {
          type: 'text',
          content:
            '오른쪽 상단 카드에서 시간 달성률을 확인합니다. 계획한 공부 시간 대비 실제 공부 시간 비율이 표시됩니다.',
        },
        {
          type: 'text',
          content:
            '하루 타임라인에서는 계획 보기, 실행 보기, 함께 보기 모드를 전환할 수 있습니다.',
        },
        {
          type: 'text',
          content:
            '학교·학원·고정 일정과 공부 계획·실행 기록을 한눈에 비교하며, 하루 일정 안에서 공부가 어떻게 진행됐는지 확인할 수 있습니다.',
        },
        {
          type: 'screenshot',
          label: '화면 이미지 준비 중',
        },
      ],
    },
    {
      title: '추가 · 수정',
      icon: 'todo-edit',
      paragraphs: [
        '하단의 스터디 플랜 추가 버튼으로 해당 날짜에 공부 계획을 바로 넣을 수 있습니다.',
        '항목을 스와이프해 수정으로 일정을 변경할 수 있습니다. 공부 스케줄에서 등록한 반복 일정도 해당 날만 수정할 수 있습니다.',
        '학부모(매니저)가 확인 도장을 남기면 목록 하단에 표시됩니다.',
      ],
    },
  ],
};
