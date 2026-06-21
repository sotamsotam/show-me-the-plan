export const PRICING_PLAN = {
  seo: {
    title: '요금 안내 — Show Me The Plan',
    description:
      '학생 월 4,900원(VAT 포함), 14일 무료 체험. 매니저(학부모·선생님) 계정은 무료.',
  },
  headline: '학생은 14일 무료, 매니저는 항상 무료',
  subcopy:
    'Free/Pro 티어 없이, 유효한 구독·체험 기간 동안 모든 기능을 이용할 수 있습니다.',
  studentPlan: {
    priceLabel: '월 4,900원',
    priceNote: 'VAT 포함 · student_monthly',
    ctaLabel: '14일 무료 체험 시작',
    features: [
      '가입 후 14일 무료 체험 (카드 등록 없음)',
      'NEIS 시간표, 스터디 플랜, TODO, 공부통계 등 전 기능',
      '체험 종료 후 구독 시 매월 자동 갱신',
      '설정 → 구독 · 결제에서 해지 예약 가능',
    ],
  },
  managerPlan: {
    priceLabel: '무료',
    priceNote: '학생 구독 유효 시 관리 가능',
    ctaLabel: '매니저 계정 만들기',
    features: [
      '학생 TODO·공부현황·통계 열람',
      '담당 학생 구독 만료 시 관리 일시 중단',
      '학생 재구독 시 연결 유지 · 관리 자동 재개',
      '구독·결제 UI 노출 없음',
    ],
  },
} as const;

export const PRICING_FAQ = [
  {
    question: '무료 체험 중에도 모든 기능을 쓸 수 있나요?',
    answer:
      '네. trialing 상태에서는 카드 등록 없이 대시보드 전 기능을 이용할 수 있습니다.',
  },
  {
    question: '체험이 끝나면 어떻게 되나요?',
    answer:
      '구독을 시작하지 않으면 대시보드 이용이 제한되고, 구독·결제 관련 화면만 이용할 수 있습니다.',
  },
  {
    question: '매니저도 결제해야 하나요?',
    answer:
      '아니요. 매니저 계정은 무료입니다. 다만 연결된 학생의 구독·체험이 유효할 때만 해당 학생을 관리할 수 있습니다.',
  },
  {
    question: '해지는 어떻게 하나요?',
    answer:
      '학생 계정 → 설정 → 구독 · 결제에서 "해지 예약"을 선택하면, 현재 이용 기간 종료일에 구독이 해지됩니다.',
  },
] as const;
