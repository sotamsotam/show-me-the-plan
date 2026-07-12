import type { PcMobileShowcaseContent } from './types';

export const HOME_PC_MOBILE_SHOWCASE: PcMobileShowcaseContent = {
  title: "스마트폰용앱과 PC용 앱이 함께 제공되는건가요?",
  lead: "큰 화면(PC)으로 스마트하게 설계하고, 한 손(모바일)으로 가볍게 실천하세요.",
  cardHeadline: "스마트폰앱과 함께 PC버전 앱을 함께 제공합니다.",
  features: [
    {
      title: "계획은 PC에서 큰 화면으로 편하게",
      points: [
        "월간·주간 계획부터 시험, 학사일정까지 시원하게 한눈에 파악",
        "큰그림을 보며 스터디플랜, 시험계획을 작성하세요",
      ],
    },
    {
      title: "실천은 모바일기기로 손쉽게",
      points: [
        "오늘 공부계획을 바로 확인하고 실천하세요",
        "타이머로 집중력을 높이고 실제 공부시간을 정확하게 파악하세요",
      ],
    },
    {
      title:
        "모바일기기로 모든기능 사용 가능하지만 계획은 PC로 작성하는게\n 훨씬 효율적입니다",
    },
  ],
  screen: {
    pc: {
      src: "/images/main_pc.png",
      alt: "쇼미플 PC 대화면 캘린더·스터디 플랜 화면",
    },
    mobile: {
      src: "/videos/mobile.mp4",
      alt: "쇼미플 모바일 TODO 실행 화면",
      type: "video",
    },
  },
};
