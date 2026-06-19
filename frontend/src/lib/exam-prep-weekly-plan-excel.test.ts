import { describe, expect, it } from 'vitest';

import type { ExamPrepWeeklyPlans } from '@/lib/exam-prep-weekly-plan';
import {
  applyExamPrepExcelImportToRound,
  buildExamPrepExcelFileName,
  buildExamPrepExcelSheetRows,
  buildLabelToTemplateKeyMap,
  parseExamPrepExcelSheetRows,
  parsePrepWeekLabel,
  sanitizeExamPrepExcelFileNameSegment,
} from '@/lib/exam-prep-weekly-plan-excel';

const subjects = [
  { id: 'korean', label: '국어', category: 'korean' as const, source: 'neis' as const },
  { id: 'english', label: '영어', category: 'english' as const, source: 'neis' as const },
  { id: 'custom-essay', label: '논술 특강', source: 'custom' as const },
];

const samplePlans: ExamPrepWeeklyPlans = {
  'sem1-r1': {
    weeks: {
      '4': {
        korean: '국어 1주차',
        english: '영어 1주차',
        'custom-essay': '논술 1주차',
      },
      '3': {
        korean: '국어 2주차',
      },
    },
  },
};

describe('parsePrepWeekLabel', () => {
  it('parses D-N주차 labels', () => {
    expect(parsePrepWeekLabel('D-4주차')).toBe(4);
    expect(parsePrepWeekLabel(' D-1주차 ')).toBe(1);
    expect(parsePrepWeekLabel('4주차')).toBeNull();
  });
});

describe('buildExamPrepExcelSheetRows', () => {
  it('builds a week-by-subject matrix for export', () => {
    expect(
      buildExamPrepExcelSheetRows({
        roundLabel: '1학기 1차',
        roundSlot: 'sem1-r1',
        weekCount: 4,
        subjects,
        plans: samplePlans,
      })
    ).toEqual([
      ['주차', '국어', '영어', '논술 특강'],
      ['D-4주차', '국어 1주차', '영어 1주차', '논술 1주차'],
      ['D-3주차', '국어 2주차', '', ''],
      ['D-2주차', '', '', ''],
      ['D-1주차', '', '', ''],
    ]);
  });
});

describe('parseExamPrepExcelSheetRows', () => {
  it('maps sheet rows back to template weeks', () => {
    const rows = buildExamPrepExcelSheetRows({
      roundLabel: '1학기 1차',
      roundSlot: 'sem1-r1',
      weekCount: 4,
      subjects,
      plans: samplePlans,
    });

    const result = parseExamPrepExcelSheetRows(rows, subjects, 4);

    expect(result.ok).toBe(true);
    expect(result.weeks).toEqual({
      '1': {
        korean: '국어 1주차',
        english: '영어 1주차',
        'label:논술 특강': '논술 1주차',
      },
      '2': {
        korean: '국어 2주차',
        english: '',
        'label:논술 특강': '',
      },
      '3': {
        korean: '',
        english: '',
        'label:논술 특강': '',
      },
      '4': {
        korean: '',
        english: '',
        'label:논술 특강': '',
      },
    });
    expect(result.preview?.filledCellCount).toBe(4);
  });

  it('warns about unknown subject columns and week rows', () => {
    const result = parseExamPrepExcelSheetRows(
      [
        ['주차', '국어', '체육'],
        ['D-4주차', '내용', '무시'],
        ['잘못된주차', '내용', ''],
      ],
      subjects,
      4
    );

    expect(result.ok).toBe(true);
    expect(result.preview?.warnings).toEqual([
      '알 수 없는 과목 열 "체육"은(는) 건너뜁니다.',
      '알 수 없는 주차 형식 "잘못된주차" 행은 건너뜁니다.',
    ]);
  });

  it('rejects cells longer than 500 characters', () => {
    const result = parseExamPrepExcelSheetRows(
      [
        ['주차', '국어'],
        ['D-4주차', 'a'.repeat(501)],
      ],
      subjects,
      4
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('500자를 초과');
  });
});

describe('applyExamPrepExcelImportToRound', () => {
  it('applies parsed excel weeks to the selected round', () => {
    const parsed = parseExamPrepExcelSheetRows(
      buildExamPrepExcelSheetRows({
        roundLabel: '1학기 1차',
        roundSlot: 'sem1-r1',
        weekCount: 4,
        subjects,
        plans: samplePlans,
      }),
      subjects,
      4
    );

    expect(parsed.ok).toBe(true);

    const result = applyExamPrepExcelImportToRound(
      {},
      parsed.weeks ?? {},
      'sem1-r2',
      subjects,
      4
    );

    expect(result.plans['sem1-r2']?.weeks).toEqual(samplePlans['sem1-r1']?.weeks);
    expect(result.appliedWeekCount).toBe(4);
  });
});

describe('buildLabelToTemplateKeyMap', () => {
  it('maps subject labels to template keys', () => {
    const map = buildLabelToTemplateKeyMap(subjects);

    expect(map.get('국어')).toBe('korean');
    expect(map.get('논술 특강')).toBe('label:논술 특강');
  });
});

describe('buildExamPrepExcelFileName', () => {
  it('sanitizes round labels for download filenames', () => {
    expect(sanitizeExamPrepExcelFileNameSegment('1학기/1차')).toBe('1학기_1차');
    expect(
      buildExamPrepExcelFileName('1학기 1차', new Date('2026-06-17T12:00:00'))
    ).toBe('시험기간공부계획_1학기 1차_20260617.xlsx');
  });
});
