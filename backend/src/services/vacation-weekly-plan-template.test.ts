import { describe, expect, it } from 'vitest';

import {
  appendVacationWeeklyPlanTemplate,
  applyTemplateToPeriod,
  createEmptyVacationWeeklyPlanTemplates,
  extractPeriodToTemplateCreateInput,
  extractPeriodToTemplateWeeks,
  hasVacationPeriodContent,
  removeVacationWeeklyPlanTemplate,
  resolveVacationWeeklyPlanTemplates,
  validateCreateVacationWeeklyPlanTemplateInput,
} from './vacation-weekly-plan-template';
import type { VacationWeeklyPlans } from './vacation-weekly-plan';

const subjects = [
  { id: 'korean', label: '국어', category: 'korean' as const, source: 'neis' as const },
  { id: 'english', label: '영어', category: 'english' as const, source: 'neis' as const },
];

const samplePlans: VacationWeeklyPlans = {
  summer: {
    weeks: {
      '1': { korean: '국어 1주차', english: '영어 1주차' },
      '2': { korean: '국어 2주차' },
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
  it('converts subject ids to template keys', () => {
    expect(extractPeriodToTemplateWeeks(samplePlans, 'summer', subjects, 6)).toEqual({
      '1': { korean: '국어 1주차', english: '영어 1주차' },
      '2': { korean: '국어 2주차' },
    });
  });
});

describe('applyTemplateToPeriod', () => {
  it('applies template content to the selected period', () => {
    const result = applyTemplateToPeriod(
      {},
      {
        weekCount: 6,
        weeks: {
          '1': { korean: '템플릿 1주차' },
          '3': { english: '템플릿 3주차' },
        },
      },
      'winter',
      subjects,
      6,
      'overwrite'
    );

    expect(result.plans.winter?.weeks).toEqual({
      '1': { korean: '템플릿 1주차' },
      '3': { english: '템플릿 3주차' },
    });
    expect(result.appliedWeekCount).toBe(2);
  });
});

describe('appendVacationWeeklyPlanTemplate', () => {
  it('appends a new template with unique name', () => {
    const existing = resolveVacationWeeklyPlanTemplates([
      {
        id: 'existing',
        name: '여름방학',
        weekCount: 6,
        createdAt: '2026-01-01T00:00:00.000Z',
        weeks: { '1': { korean: '내용' } },
      },
    ]);

    const result = appendVacationWeeklyPlanTemplate(existing, {
      name: '여름방학',
      weekCount: 6,
      weeks: { '2': { english: '내용' } },
    });

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.template.name).toBe('여름방학 (2)');
      expect(result.templates).toHaveLength(2);
    }
  });
});

describe('removeVacationWeeklyPlanTemplate', () => {
  it('removes a template by id', () => {
    const templates = resolveVacationWeeklyPlanTemplates([
      {
        id: 'keep',
        name: '유지',
        weekCount: 4,
        createdAt: '2026-01-01T00:00:00.000Z',
        weeks: { '1': { korean: '내용' } },
      },
      {
        id: 'remove',
        name: '삭제',
        weekCount: 4,
        createdAt: '2026-02-01T00:00:00.000Z',
        weeks: { '1': { english: '내용' } },
      },
    ]);

    const result = removeVacationWeeklyPlanTemplate(templates, 'remove');
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.templates).toHaveLength(1);
      expect(result.templates[0]?.id).toBe('keep');
    }
  });
});

describe('validateCreateVacationWeeklyPlanTemplateInput', () => {
  it('rejects invalid week counts', () => {
    expect(
      validateCreateVacationWeeklyPlanTemplateInput({
        name: '템플릿',
        weekCount: 20,
        weeks: { '1': { korean: '내용' } },
      })
    ).toEqual({ error: '방학 주차는 1~16 사이여야 합니다.' });
  });
});

describe('extractPeriodToTemplateCreateInput', () => {
  it('returns null when empty', () => {
    expect(
      extractPeriodToTemplateCreateInput('빈', {}, 'summer', subjects, 6)
    ).toBeNull();
  });
});

describe('resolveVacationWeeklyPlanTemplates', () => {
  it('returns empty array for invalid input', () => {
    expect(resolveVacationWeeklyPlanTemplates(null)).toEqual(
      createEmptyVacationWeeklyPlanTemplates()
    );
  });
});
