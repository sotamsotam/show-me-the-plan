import type { CrossLinkCard, GradeCard } from './types';

export const SERVICE_NAME = '쇼미더플랜';

export const MAIN_SLOGAN = '계획을 플레이하는 순간, 공부는 퀘스트가 된다.';

export const SUB_SLOGAN =
  '온라인 스터디 플래너 SHOW ME THE PLAN';

export const NAV_LINKS = [
  { label: '홈', href: '/' },
  { label: '요금', href: '/pricing' },
  { label: '초등', href: '/elementary' },
  { label: '중등', href: '/middle' },
  { label: '고등', href: '/high' },
  { label: '사용후기', href: '/reviews' },
] as const;

const HIDDEN_HEADER_NAV_HREFS = new Set(['/elementary', '/middle', '/high']);

export const HEADER_NAV_LINKS = NAV_LINKS.filter(
  (link) => !HIDDEN_HEADER_NAV_HREFS.has(link.href),
);

export const HOME_KEY_FEATURES_SHOWCASE = [
  {
    title: "학교시간표·시험·방학·학사일정",
    titleAccent: "내 일정표에 자동으로 반영",
    description:
      "직접 입력할 필요가 없습니다. 시험 D-day 역산, 방학·평소 복습루틴까지 학교 일정에 맞춰 주차별로 공부 계획을 손쉽게 세웁니다.",
    detailLabel: '자세히 보기',
    icon: "calendar" as const,
    screen: {
      src: "/videos/time-table.mp4",
      alt: "학교시간표·학사일정 연동 화면",
      device: "desktop" as const,
      type: "video" as const,
    },
  },
  {
    title: "학원숙제, 단어암기, 수업복습 등",
    titleAccent: "루틴한 공부는 한번만 입력하세요",
    description:
      '"번거롭게 매번 입력할 필요가 없습니다. 학원숙제, 단어암기, 수업복습 등 루틴한 공부는 한번만 입력하세요.',
    detailLabel: '자세히 보기',
    icon: "checklist" as const,
    screen: {
      src: "/videos/routine.mp4",
      alt: "루틴 공부 TODO 미션 화면",
      device: "mobile" as const,
      type: "video" as const,
    },
  },
  {
    title: "주차별 시험 대비 계획",
    titleAccent: "탬플릿 저장 관리기능",
    description:
      "시험대비 주차별 계획을 등록하고 일정표에서 드래그로 손쉽게 일정을 등록하고 일정수정시 바로 수정할 수 있습니다. 주차별 계획을 저장하고 다음 시험에 자동으로 적용할 수 있습니다.",
    detailLabel: '자세히 보기',
    icon: "timetable" as const,
    screen: {
      src: "/videos/test-templet.mp4",
      alt: "시험계획 탬플릿 기능 데모",
      device: "desktop" as const,
      type: "video" as const,
    },
  },
] as const;

export const HOME_FEATURES = [
  { title: '주차별 스터디 플랜', description: '시험·방학·평소 기간별 공부 계획' },
  { title: '일일 TODO', description: '오늘의 미션 — 분량 단위로 끊어 실행' },
  { title: 'NEIS 시간표', description: '학교·학년·반 연동 캘린더' },
  { title: '공부현황', description: '실행 타임라인 기록' },
  { title: '공부통계', description: '과목별 시간·달성률 분석' },
  { title: '매니저', description: '학부모·선생님이 학생 현황 함께 확인' },
] as const;

export const GRADE_CARDS: GradeCard[] = [
  {
    title: "초등",
    subtitle: "공부 습관의 황금기",
    description: [
      "학교시간표에 맞춰 복습습관 만들기",
      "분량·예상 시간으로 공부하는 연습하기",
      "매니저(부모)와 달성률을 함께 보며 칭찬·격려",
    ],
    href: "/elementary",
  },
  {
    title: "중등",
    subtitle: "고등진학 전 실전연습",
    description: [
      "시험·평소·방학 3모드로 상황에 맞게 전환",
      "주차별 시험계획과 실천연습",
      "벼락치기 대신 꾸준한 공부루틴 완성하기",
    ],
    href: "/middle",
  },
  {
    title: "고등",
    subtitle: "데이터 기반 자기주도",
    description: [
      "N회독 주차 계획으로 반복 학습 설계",
      "계획 대비 실행·달성률을 숫자로 확인",
      "내신·모의고사·방학 기간별 학습 리듬 관리",
    ],
    href: "/high",
  },
];

export const CROSS_LINKS: Record<string, CrossLinkCard[]> = {
  elementary: [
    { label: '중등', href: '/middle' },
    { label: '고등', href: '/high' },
    { label: '학부모용', href: '/for-parents' },
  ],
  middle: [
    { label: '초등', href: '/elementary' },
    { label: '고등', href: '/high' },
    { label: '학생용', href: '/for-students' },
  ],
  high: [
    { label: '초등', href: '/elementary' },
    { label: '중등', href: '/middle' },
    { label: '학생용', href: '/for-students' },
  ],
};
