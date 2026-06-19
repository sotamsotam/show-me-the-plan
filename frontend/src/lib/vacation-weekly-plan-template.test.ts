import { describe, expect, it } from 'vitest';

import type { VacationWeeklyPlans } from '@/lib/vacation-weekly-plan';
import {
  applyTemplateToPeriod,
  buildTemplateSubjectKey,
  countTemplateSubjectKeys,
  countTemplateWeeksWithContent,
  createEmptyVacationWeeklyPlanTemplates,
  extractPeriodToTemplateCreateInput,
  extractPeriodToTemplateWeeks,
  getUnmatchedTemplateSubjectLabels,
  hasVacationPeriodContent,
  isValidTemplateSubjectKey,
  MAX_VACATION_WEEKLY_PLAN_TEMPLATE_NAME_LENGTH,
  normalizeTemplateSubjectLabel,
  resolveUniqueTemplateName,
  resolveVacationWeeklyPlanTemplates,
  validateCreateVacationWeeklyPlanTemplateInput,
} from '@/lib/vacation-weekly-plan-template';

const subjects = [
  { id: 'korean', label: '국어', category: 'korean' as const, source: 'neis' as const },
  { id: 'english', label: '영어', category: 'english' as const, source: 'neis' as const },
  { id: 'custom-essay', label: '논술 특강', source: 'custom' as const },
];

const samplePlans: VacationWeeklyPlans = {
  summer: {
    weeks: {
      '1': {
        korean: '국어 1주차',
        english: '영어 1주차',
        'custom-essay': '논술 1주차',
      },
      '2': {
        korean: '국어 2주차',
      },
    },
  },
};

describe('hasVacationPeriodContent', () => {
  it('detects whether the selected period has any content', () => {
    expect(hasVacationPeriodContent(samplePlans, 'summer')).toBe(true);
    expect(hasVacationPeriodContent(samplePlans, 'winter')).toBe(false);
  });
});

describe('extractPeriodToTemplateWeeks', () => {
  it('converts subject ids to template keys for the selected period', () => {
    expect(
      extractPeriodToTemplateWeeks(samplePlans, 'summer', subjects, 6)
    ).toEqual({
      '1': {
        korean: '국어 1주차',
        english: '영어 1주차',
        'label:논술 특강': '논술 1주차',
      },
      '2': {
        korean: '국어 2주차',
      },
    });
  });
});

describe('applyTemplateToPeriod', () => {
  it('applies template content and reports skipped subjects', () => {
    const result = applyTemplateToPeriod(
      samplePlans,
      {
        weekCount: 6,
        weeks: {
          '1': {
            korean: '템플릿 국어 1주차',
            science: '템플릿 과학 1주차',
          },
        },
      },
      'winter',
      subjects,
      6,
      'overwrite'
    );

    expect(result.skippedSubjectKeys).toEqual(['science']);
    expect(result.plans.winter?.weeks?.['1']).toEqual({
      korean: '템플릿 국어 1주차',
    });
  });

  it('maps ordinal weeks directly to vacation week numbers', () => {
    const result = applyTemplateToPeriod(
      {},
      {
        weekCount: 6,
        weeks: {
          '1': { korean: '1주차 국어' },
          '2': { korean: '2주차 국어' },
        },
      },
      'summer',
      subjects,
      6,
      'overwrite'
    );

    expect(result.plans.summer?.weeks).toEqual({
      '1': { korean: '1주차 국어' },
      '2': { korean: '2주차 국어' },
    });
  });

  it('applies only up to the target week count', () => {
    const result = applyTemplateToPeriod(
      {},
      {
        weekCount: 8,
        weeks: {
          '1': { korean: '1주차' },
          '5': { korean: '5주차' },
        },
      },
      'summer',
      subjects,
      4,
      'overwrite'
    );

    expect(result.plans.summer?.weeks).toEqual({
      '1': { korean: '1주차' },
    });
  });
});

describe('extractPeriodToTemplateCreateInput', () => {
  it('returns null when the period has no content', () => {
    expect(
      extractPeriodToTemplateCreateInput('빈 템플릿', {}, 'summer', subjects, 6)
    ).toBeNull();
  });
});

describe('resolveUniqueTemplateName', () => {
  it('appends numeric suffixes for duplicate names', () => {
    const templates = resolveVacationWeeklyPlanTemplates([
      {
        id: 'one',
        name: '여름방학 6주',
        weekCount: 6,
        createdAt: '2026-03-01T00:00:00.000Z',
        weeks: { '1': { math: '내용' } },
      },
    ]);

    expect(resolveUniqueTemplateName('여름방학 6주', templates)).toBe('여름방학 6주 (2)');
  });
});

describe('getUnmatchedTemplateSubjectLabels', () => {
  it('returns human-readable labels for skipped subject keys', () => {
    expect(getUnmatchedTemplateSubjectLabels(['science', 'label:논술 특강'])).toEqual([
      '과학',
      '논술 특강',
    ]);
  });
});

describe('buildTemplateSubjectKey', () => {
  it('uses category when available', () => {
    expect(
      buildTemplateSubjectKey({
        id: 'custom-1',
        label: '수학Ⅰ',
        category: 'math',
        source: 'custom',
      })
    ).toBe('math');
  });
});

describe('isValidTemplateSubjectKey', () => {
  it('accepts legacy categories and label-prefixed keys', () => {
    expect(isValidTemplateSubjectKey('english')).toBe(true);
    expect(isValidTemplateSubjectKey('label:논술 특강')).toBe(true);
    expect(isValidTemplateSubjectKey('invalid')).toBe(false);
  });
});

describe('resolveVacationWeeklyPlanTemplates', () => {
  it('returns an empty array for missing or invalid values', () => {
    expect(resolveVacationWeeklyPlanTemplates(null)).toEqual([]);
    expect(resolveVacationWeeklyPlanTemplates('invalid')).toEqual(
      createEmptyVacationWeeklyPlanTemplates()
    );
  });
});

describe('validateCreateVacationWeeklyPlanTemplateInput', () => {
  it('accepts valid create input', () => {
    expect(
      validateCreateVacationWeeklyPlanTemplateInput({
        name: '여름방학 6주',
        weekCount: 6,
        weeks: {
          '1': { korean: '단원 정리' },
          '6': { english: '문법 복습' },
        },
      })
    ).toEqual({
      template: {
        name: '여름방학 6주',
        weekCount: 6,
        weeks: {
          '1': { korean: '단원 정리' },
          '6': { english: '문법 복습' },
        },
      },
    });
  });

  it('rejects empty names and week numbers above weekCount', () => {
    expect(
      validateCreateVacationWeeklyPlanTemplateInput({
        name: '',
        weekCount: 6,
        weeks: { '1': { math: '내용' } },
      })
    ).toEqual({ error: '템플릿 제목을 입력해 주세요.' });

    expect(
      validateCreateVacationWeeklyPlanTemplateInput({
        name: 'a'.repeat(MAX_VACATION_WEEKLY_PLAN_TEMPLATE_NAME_LENGTH + 1),
        weekCount: 6,
        weeks: { '1': { math: '내용' } },
      })
    ).toEqual({
      error: `템플릿 제목은 ${MAX_VACATION_WEEKLY_PLAN_TEMPLATE_NAME_LENGTH}자 이하여야 합니다.`,
    });
  });
});

describe('template counters', () => {
  it('counts weeks with content and unique subject keys', () => {
    const weeks = {
      '1': { korean: '내용', math: '내용' },
      '2': { korean: '   ' },
      '3': { english: '내용' },
    };

    expect(countTemplateWeeksWithContent(weeks)).toBe(2);
    expect(countTemplateSubjectKeys(weeks)).toBe(3);
  });
});

describe('normalizeTemplateSubjectLabel', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeTemplateSubjectLabel('  논술   특강  ')).toBe('논술 특강');
  });
});
