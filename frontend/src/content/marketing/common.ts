import type { CrossLinkCard, GradeCard, TargetCard, ValueCard } from './types';

export const SERVICE_NAME = '쇼미더플랜';

export const MAIN_SLOGAN = '계획을 플레이하는 순간, 공부는 퀘스트가 된다.';

export const SUB_SLOGAN =
  '학교 생활에 맞춘 학습 계획부터 실행·기록·통계까지, 한곳에서.';

export const CORE_VALUES: ValueCard[] = [
  {
    title: '객관적 관리',
    description:
      '주관적인 감정이 아닌, 데이터(분량·달성률) 기반의 학습 관리. "느낌상 열심히"가 아니라 기록으로 확인합니다.',
  },
  {
    title: '공부의 본질',
    description:
      "'시간'이 아닌 '분량' 중심의 계획. \"2시간 앉아 있기\"가 아니라 \"교과서 1~3단원 1회독\"처럼 끝낼 수 있는 미션으로 집중력을 높입니다.",
  },
  {
    title: '지속 가능한 루틴',
    description:
      'NEIS 시간표 연동으로 실제 학교 생활을 반영. 학교·자습·학원 시간 위에 공부 계획을 자연스럽게 올립니다.',
  },
];

export const NAV_LINKS = [
  { label: '홈', href: '/' },
  { label: '요금', href: '/pricing' },
  { label: '초등', href: '/elementary' },
  { label: '중등', href: '/middle' },
  { label: '고등', href: '/high' },
  { label: '사용후기', href: '/reviews' },
] as const;

export const HOME_KEY_FEATURES_SHOWCASE = [
  {
    title: "학교시간표·시험·방학·학사일정",
    titleAccent: "내 일정표에 자동으로 반영",
    description:
      "직접 입력할 필요가 없습니다. 시험 D-day 역산, 방학·평소 복습루틴까지 학교 일정에 맞춰 주차별로 공부 계획을 손쉽게 세웁니다.",
    detailLabel: '자세히 보기',
    icon: "calendar" as const,
    screen: {
      src: "/images/pc_plan.jpg",
      alt: "주차별 스터디 플랜 화면",
      device: "desktop" as const,
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
      src: "/images/mobile_todo.jpg",
      alt: "오늘의 TODO 미션 화면",
      device: "mobile" as const,
    },
  },
  {
    title: "시험계획 탬플릿 기능",
    titleAccent: "저장 후 다음시험에 자동 적용 ",
    description:
      "중간고사, 기말고사 등 이전 시험계획을 불러와서 더 나은계획으로 업그레이드 하면서 바로 적용하세요",
    detailLabel: '자세히 보기',
    icon: "timetable" as const,
    screen: {
      src: "/images/main_pc.png",
      alt: "NEIS 시간표 연동 스케줄 화면",
      device: "desktop" as const,
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

export const HOME_TARGET_CARDS: TargetCard[] = [
  {
    title: '학부모·선생님',
    description: '"오늘 공부했니?" 대신, 데이터로 아이의 성장을 응원하세요',
    href: '/for-parents',
    buttonLabel: '학부모용 보기',
  },
  {
    title: '중·고등학생',
    description: '계획을 끝내면 완전한 자유! 죄책감 없는 휴식을 즐기세요',
    href: '/for-students',
    buttonLabel: '학생용 보기',
  },
];

export const GRADE_CARDS: GradeCard[] = [
  {
    title: '초등',
    subtitle: '공부 습관의 첫걸음',
    description: '선생님과의 약속(숙제)부터, 꾸준한 루틴까지',
    href: '/elementary',
  },
  {
    title: '중등',
    subtitle: '늘어나는 과목, 전략적 내신',
    description: '시험 2~4주 전 역산형 주차 계획',
    href: '/middle',
  },
  {
    title: '고등',
    subtitle: '데이터 기반 자기주도',
    description: '감이 아닌 숫자로 입시를 설계',
    href: '/high',
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
