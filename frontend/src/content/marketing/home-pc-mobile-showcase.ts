import type { PcMobileShowcaseContent } from './types';

export const HOME_PC_MOBILE_SHOWCASE: PcMobileShowcaseContent = {
  title: '스마트폰용앱과 PC용 앱이 함께 제공되는건가요?',
  lead: '큰 화면(PC)으로 스마트하게 설계하고, 한 손(모바일)으로 가볍게 실천하세요.',
  cardHeadline: '스마트폰앱과 함께 PC버전 앱을 함께 제공합니다.',
  features: [
    {
      title: '한눈에 들어오는 대화면 캘린더',
      points: [
        '월간·주간 계획부터 시험, 학사일정까지 시원하게 한눈에 파악',
        '큰그림을 보며 스터디플랜, 시험계획을 작성하세요',
      ],
    },
    {
      title: "밀리거나 바뀐 일정은 '드래그 앤 드롭'으로 1초 만에 슥 옮기면 끝",
    },
  ],
  screen: {
    pc: {
      src: '/images/main_pc.png',
      alt: '쇼미플 PC 대화면 캘린더·스터디 플랜 화면',
    },
    mobile: {
      src: '/images/mobile_todo.jpg',
      alt: '쇼미플 모바일 TODO 실행 화면',
    },
  },
};
