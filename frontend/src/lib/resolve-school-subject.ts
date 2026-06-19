import type { StudyPlanSubject } from '@/lib/study-plan-todo';

interface SubjectRule {
  key: StudyPlanSubject;
  patterns: RegExp[];
}

const SUBJECT_RULES: SubjectRule[] = [
  { key: 'korean', patterns: [/국어/, /화법/, /작문/, /문학/, /독서/, /언어와\s*매체/] },
  { key: 'english', patterns: [/영어/] },
  { key: 'math', patterns: [/수학/, /대수/, /기하/, /미적분/, /확률/, /통계/] },
  {
    key: 'science',
    patterns: [/과학/, /물리/, /화학/, /생물/, /생명/, /지구/, /통합과학/],
  },
  { key: 'social', patterns: [/사회/, /통합사회/, /일반사회/, /정치/, /경제/, /법과\s*정치/] },
  { key: 'history', patterns: [/역사/, /한국사/, /세계사/, /동아시아사/] },
  { key: 'ethics', patterns: [/도덕/, /윤리/] },
  { key: 'tech_home', patterns: [/기술/, /기가/, /실과/, /공학/, /가정/] },
  { key: 'info', patterns: [/정보/, /컴퓨터/, /코딩/, /소프트웨어/] },
  { key: 'chinese', patterns: [/한문/, /중국어/] },
];

export function resolveSchoolSubject(subjectName: string): StudyPlanSubject {
  const normalized = subjectName.replace(/\s+/g, '').trim();

  if (!normalized) {
    return 'other';
  }

  for (const rule of SUBJECT_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.key;
    }
  }

  return 'other';
}
