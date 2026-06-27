import { describe, expect, it } from 'vitest';

import {
  applyTemplateToRound,
  buildTemplateSubjectKey,
  countTemplateSubjectKeys,
  countTemplateWeeksWithContent,
  createEmptyExamPrepWeeklyPlanTemplates,
  extractRoundToTemplateCreateInput,
  extractRoundToTemplateWeeks,
  getUnmatchedTemplateSubjectLabels,
  hasExamPrepRoundContent,
  isValidTemplateSubjectKey,
  MAX_EXAM_PREP_WEEKLY_PLAN_TEMPLATE_NAME_LENGTH,
  normalizeTemplateSubjectLabel,
  resolveExamPrepWeeklyPlanTemplates,
  resolveUniqueTemplateName,
  validateCreateExamPrepWeeklyPlanTemplateInput,
} from '@/lib/exam-prep-weekly-plan-template';
import type { ExamPrepWeeklyPlans } from '@/lib/exam-prep-weekly-plan';

const subjects = [
  { id: 'korean', label: '국어', category: 'korean' as const, source: 'neis' as const },
  { id: 'english', label: '영어', category: 'english' as const, source: 'neis' as const },
  { id: 'custom-essay', label: '논술 특강', source: 'custom' as const },
];

const samplePlans: ExamPrepWeeklyPlans = {
  'sem1-r1': {
    weeks: {
      '4': {
        korean: [{ id: 'k-1', title: '국어 1주차' }],
        english: [{ id: 'e-1', title: '영어 1주차' }],
        'custom-essay': [{ id: 'c-1', title: '논술 1주차' }],
      },
      '3': {
        korean: [{ id: 'k-2', title: '국어 2주차' }],
      },
    },
  },
};

describe('hasExamPrepRoundContent', () => {
  it('detects whether the selected round has any content', () => {
    expect(hasExamPrepRoundContent(samplePlans, 'sem1-r1')).toBe(true);
    expect(hasExamPrepRoundContent(samplePlans, 'sem1-r2')).toBe(false);
  });
});

describe('extractRoundToTemplateWeeks', () => {
  it('converts subject ids to template keys for the selected round', () => {
    expect(
      extractRoundToTemplateWeeks(samplePlans, 'sem1-r1', subjects, 4)
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

describe('applyTemplateToRound', () => {
  it('applies template content and reports skipped subjects', () => {
    const result = applyTemplateToRound(
      samplePlans,
      {
        weekCount: 4,
        weeks: {
          '1': {
            korean: '템플릿 국어 1주차',
            science: '템플릿 과학 1주차',
          },
        },
      },
      'sem1-r2',
      subjects,
      4,
      'overwrite'
    );

    expect(result.skippedSubjectKeys).toEqual(['science']);
    expect(result.plans['sem1-r2']?.weeks?.['4']?.korean).toEqual([
      expect.objectContaining({ title: '템플릿 국어 1주차' }),
    ]);
  });

  it('does not duplicate content into lower prep weeks for ordinal templates', () => {
    const result = applyTemplateToRound(
      {},
      {
        weekCount: 6,
        weeks: {
          '1': { korean: 'D-6 국어' },
          '2': { korean: 'D-5 국어' },
        },
      },
      'sem1-r2',
      subjects,
      6,
      'overwrite'
    );

    expect(result.plans['sem1-r2']?.weeks?.['6']?.korean).toEqual([
      expect.objectContaining({ title: 'D-6 국어' }),
    ]);
    expect(result.plans['sem1-r2']?.weeks?.['5']?.korean).toEqual([
      expect.objectContaining({ title: 'D-5 국어' }),
    ]);
  });

  it('does not duplicate legacy absolute week keys into lower prep weeks', () => {
    const result = applyTemplateToRound(
      {},
      {
        weekCount: 6,
        weeks: {
          '5': { korean: 'D-5 국어' },
          '6': { korean: 'D-6 국어' },
        },
      },
      'sem1-r2',
      subjects,
      6,
      'overwrite'
    );

    expect(result.plans['sem1-r2']?.weeks?.['6']?.korean).toEqual([
      expect.objectContaining({ title: 'D-6 국어' }),
    ]);
    expect(result.plans['sem1-r2']?.weeks?.['5']?.korean).toEqual([
      expect.objectContaining({ title: 'D-5 국어' }),
    ]);
  });
});

describe('extractRoundToTemplateCreateInput', () => {
  it('returns null when the round has no content', () => {
    expect(
      extractRoundToTemplateCreateInput('빈 템플릿', {}, 'sem1-r1', subjects, 4)
    ).toBeNull();
  });
});

describe('resolveUniqueTemplateName', () => {
  it('appends numeric suffixes for duplicate names', () => {
    const templates = resolveExamPrepWeeklyPlanTemplates([
      {
        id: 'one',
        name: '중간고사 4주',
        weekCount: 4,
        createdAt: '2026-03-01T00:00:00.000Z',
        weeks: { '1': { math: '내용' } },
      },
    ]);

    expect(resolveUniqueTemplateName('중간고사 4주', templates)).toBe('중간고사 4주 (2)');
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

  it('falls back to label prefix for custom subjects without category', () => {
    expect(
      buildTemplateSubjectKey({
        id: 'custom-2',
        label: '  논술  특강 ',
        source: 'custom',
      })
    ).toBe('label:논술 특강');
  });
});

describe('isValidTemplateSubjectKey', () => {
  it('accepts legacy categories and label-prefixed keys', () => {
    expect(isValidTemplateSubjectKey('english')).toBe(true);
    expect(isValidTemplateSubjectKey('label:논술 특강')).toBe(true);
    expect(isValidTemplateSubjectKey('invalid')).toBe(false);
    expect(isValidTemplateSubjectKey('label:')).toBe(false);
  });
});

describe('resolveExamPrepWeeklyPlanTemplates', () => {
  it('returns an empty array for missing or invalid values', () => {
    expect(resolveExamPrepWeeklyPlanTemplates(null)).toEqual([]);
    expect(resolveExamPrepWeeklyPlanTemplates({})).toEqual([]);
    expect(resolveExamPrepWeeklyPlanTemplates('invalid')).toEqual(
      createEmptyExamPrepWeeklyPlanTemplates()
    );
  });

  it('normalizes valid templates and sorts by createdAt descending', () => {
    const templates = resolveExamPrepWeeklyPlanTemplates([
      {
        id: 'older',
        name: '  이전 템플릿 ',
        weekCount: 4,
        createdAt: '2026-01-01T00:00:00.000Z',
        weeks: {
          '1': { korean: '교과서 정리' },
        },
      },
      {
        id: 'newer',
        name: '최신 템플릿',
        weekCount: 4,
        createdAt: '2026-03-01T00:00:00.000Z',
        weeks: {
          '2': { math: '기출 정리' },
        },
      },
      {
        id: 'invalid',
        name: '',
        weekCount: 4,
        createdAt: '2026-03-01T00:00:00.000Z',
        weeks: {
          '1': { korean: '무시' },
        },
      },
    ]);

    expect(templates).toHaveLength(2);
    expect(templates[0]?.id).toBe('newer');
    expect(templates[1]?.name).toBe('이전 템플릿');
  });
});

describe('validateCreateExamPrepWeeklyPlanTemplateInput', () => {
  it('accepts valid create input', () => {
    expect(
      validateCreateExamPrepWeeklyPlanTemplateInput({
        name: '중간고사 4주',
        weekCount: 4,
        weeks: {
          '1': { korean: '단원 정리' },
          '4': { english: '문법 복습' },
        },
      })
    ).toEqual({
      template: {
        name: '중간고사 4주',
        weekCount: 4,
        weeks: {
          '1': { korean: '단원 정리' },
          '4': { english: '문법 복습' },
        },
      },
    });
  });

  it('rejects empty names and week numbers above weekCount', () => {
    expect(
      validateCreateExamPrepWeeklyPlanTemplateInput({
        name: '',
        weekCount: 4,
        weeks: { '1': { math: '내용' } },
      })
    ).toEqual({ error: '템플릿 제목을 입력해 주세요.' });

    expect(
      validateCreateExamPrepWeeklyPlanTemplateInput({
        name: 'a'.repeat(MAX_EXAM_PREP_WEEKLY_PLAN_TEMPLATE_NAME_LENGTH + 1),
        weekCount: 4,
        weeks: { '1': { math: '내용' } },
      })
    ).toEqual({
      error: `템플릿 제목은 ${MAX_EXAM_PREP_WEEKLY_PLAN_TEMPLATE_NAME_LENGTH}자 이하여야 합니다.`,
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
