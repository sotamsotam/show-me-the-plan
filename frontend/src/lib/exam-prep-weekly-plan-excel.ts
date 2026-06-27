import {
  formatPrepWeekLabel,
  listPrepWeekNumbers,
  MAX_EXAM_PREP_WEEKS,
  MIN_EXAM_PREP_WEEKS,
  type ExamRoundSlot,
} from '@/lib/exam-countdown';
import {
  examPrepWeeklyPlanItemsToMultilineText,
  getExamPrepWeeklyPlanItems,
  MAX_EXAM_PREP_WEEKLY_PLAN_ITEM_TITLE_LENGTH,
  type ExamPrepWeeklyPlans,
} from '@/lib/exam-prep-weekly-plan';
import {
  applyTemplateToRound,
  buildTemplateSubjectKey,
  countTemplateSubjectKeys,
  countTemplateWeeksWithContent,
  normalizeTemplateSubjectLabel,
  type ApplyExamPrepTemplateResult,
  type ExamPrepWeeklyPlanTemplateWeekSubjects,
} from '@/lib/exam-prep-weekly-plan-template';
import type { UserSubject } from '@/lib/user-subject';

/**
 * Excel format (single sheet):
 * - Row 1: "주차" | subject labels (matches profile subject labels)
 * - Row 2+: "D-N주차" | cell content per subject
 *
 * Import policy:
 * - overwrite matched week/subject cells (empty cell clears content)
 * - rows with unknown week labels or out-of-range weeks are skipped (warning)
 * - columns with unknown subject labels are skipped (warning)
 * - week rows not present in the file leave existing data unchanged
 */

export const EXAM_PREP_EXCEL_WEEK_HEADER = '주차';
const PREP_WEEK_LABEL_PATTERN = /^D-(\d+)주차$/;

export interface ExamPrepExcelExportInput {
  roundLabel: string;
  roundSlot: ExamRoundSlot;
  weekCount: number;
  subjects: UserSubject[];
  plans: ExamPrepWeeklyPlans;
}

export interface ExamPrepExcelImportPreview {
  weekCount: number;
  subjectCount: number;
  filledCellCount: number;
  warnings: string[];
}

export interface ParseExamPrepExcelResult {
  ok: boolean;
  error?: string;
  weeks?: Partial<Record<string, ExamPrepWeeklyPlanTemplateWeekSubjects>>;
  preview?: ExamPrepExcelImportPreview;
}

export interface ApplyExamPrepExcelImportResult extends ApplyExamPrepTemplateResult {
  warnings: string[];
}

function normalizeCellValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return normalizeCellValue(String(value));
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return '';
  }

  if (normalized.length > MAX_EXAM_PREP_WEEKLY_PLAN_ITEM_TITLE_LENGTH) {
    return null;
  }

  return normalized;
}

function normalizeSheetRows(rows: unknown): string[][] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => {
    if (!Array.isArray(row)) {
      return [];
    }

    return row.map((cell) => {
      if (cell === null || cell === undefined) {
        return '';
      }

      if (typeof cell === 'number') {
        return String(cell);
      }

      if (typeof cell === 'string') {
        return cell;
      }

      return String(cell);
    });
  });
}

export function sanitizeExamPrepExcelFileNameSegment(value: string): string {
  const sanitized = value.replace(/[\\/:*?"<>|]/g, '_').trim();
  return sanitized || '회차';
}

export function buildExamPrepExcelFileName(roundLabel: string, date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const label = sanitizeExamPrepExcelFileNameSegment(roundLabel);

  return `시험기간공부계획_${label}_${year}${month}${day}.xlsx`;
}

export function buildLabelToTemplateKeyMap(subjects: UserSubject[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const subject of subjects) {
    const normalizedLabel = normalizeTemplateSubjectLabel(subject.label);
    if (!map.has(normalizedLabel)) {
      map.set(normalizedLabel, buildTemplateSubjectKey(subject));
    }
  }

  return map;
}

export function parsePrepWeekLabel(label: string): number | null {
  const trimmed = label.trim();
  const match = PREP_WEEK_LABEL_PATTERN.exec(trimmed);

  if (!match) {
    return null;
  }

  const weekNumber = Number(match[1]);
  if (
    !Number.isInteger(weekNumber) ||
    weekNumber < MIN_EXAM_PREP_WEEKS ||
    weekNumber > MAX_EXAM_PREP_WEEKS
  ) {
    return null;
  }

  return weekNumber;
}

function absoluteWeekToOrdinal(absoluteWeek: number, weekCount: number): number | null {
  const prepWeeks = listPrepWeekNumbers(weekCount);
  const index = prepWeeks.indexOf(absoluteWeek);

  if (index === -1) {
    return null;
  }

  return index + 1;
}

export function buildExamPrepExcelSheetRows(input: ExamPrepExcelExportInput): string[][] {
  const weekNumbers = listPrepWeekNumbers(input.weekCount);
  const header = [
    EXAM_PREP_EXCEL_WEEK_HEADER,
    ...input.subjects.map((subject) => subject.label),
  ];
  const rows: string[][] = [header];

  for (const weekNumber of weekNumbers) {
    const row = [formatPrepWeekLabel(weekNumber)];

    for (const subject of input.subjects) {
      row.push(
        examPrepWeeklyPlanItemsToMultilineText(
          getExamPrepWeeklyPlanItems(
            input.plans,
            input.roundSlot,
            weekNumber,
            subject.id
          )
        )
      );
    }

    rows.push(row);
  }

  return rows;
}

export function parseExamPrepExcelSheetRows(
  rawRows: unknown,
  subjects: UserSubject[],
  weekCount: number
): ParseExamPrepExcelResult {
  const rows = normalizeSheetRows(rawRows);

  if (rows.length === 0) {
    return {
      ok: false,
      error: '엑셀 파일에 데이터가 없습니다.',
    };
  }

  const headerRow = rows[0];
  if (headerRow.length < 2) {
    return {
      ok: false,
      error: '첫 행에 주차 열과 과목 열이 필요합니다.',
    };
  }

  if (normalizeTemplateSubjectLabel(headerRow[0]) !== EXAM_PREP_EXCEL_WEEK_HEADER) {
    return {
      ok: false,
      error: `첫 열 헤더는 "${EXAM_PREP_EXCEL_WEEK_HEADER}"이어야 합니다.`,
    };
  }

  const labelToTemplateKey = buildLabelToTemplateKeyMap(subjects);
  const columnTemplateKeys: Array<string | null> = [];
  const warnings: string[] = [];
  const seenSubjectLabels = new Set<string>();

  for (let columnIndex = 1; columnIndex < headerRow.length; columnIndex += 1) {
    const rawLabel = headerRow[columnIndex]?.trim() ?? '';

    if (!rawLabel) {
      columnTemplateKeys.push(null);
      continue;
    }

    const normalizedLabel = normalizeTemplateSubjectLabel(rawLabel);
    const templateKey = labelToTemplateKey.get(normalizedLabel);

    if (!templateKey) {
      columnTemplateKeys.push(null);
      if (!seenSubjectLabels.has(normalizedLabel)) {
        seenSubjectLabels.add(normalizedLabel);
        warnings.push(`알 수 없는 과목 열 "${rawLabel}"은(는) 건너뜁니다.`);
      }
      continue;
    }

    columnTemplateKeys.push(templateKey);
  }

  const matchedSubjectCount = columnTemplateKeys.filter(Boolean).length;
  if (matchedSubjectCount === 0) {
    return {
      ok: false,
      error: '현재 프로필과 일치하는 과목 열이 없습니다.',
    };
  }

  const weeks: Partial<Record<string, ExamPrepWeeklyPlanTemplateWeekSubjects>> = {};
  let filledCellCount = 0;
  const seenWeekWarnings = new Set<string>();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const weekLabel = row[0]?.trim() ?? '';

    if (!weekLabel) {
      continue;
    }

    const absoluteWeek = parsePrepWeekLabel(weekLabel);
    if (absoluteWeek === null) {
      if (!seenWeekWarnings.has(weekLabel)) {
        seenWeekWarnings.add(weekLabel);
        warnings.push(`알 수 없는 주차 형식 "${weekLabel}" 행은 건너뜁니다.`);
      }
      continue;
    }

    const ordinal = absoluteWeekToOrdinal(absoluteWeek, weekCount);
    if (ordinal === null) {
      if (!seenWeekWarnings.has(weekLabel)) {
        seenWeekWarnings.add(weekLabel);
        warnings.push(
          `현재 회차 준비 기간(${weekCount}주)에 없는 주차 "${weekLabel}" 행은 건너뜁니다.`
        );
      }
      continue;
    }

    const weekSubjects: ExamPrepWeeklyPlanTemplateWeekSubjects = {};
    let rowHasContent = false;

    for (let columnIndex = 1; columnIndex < headerRow.length; columnIndex += 1) {
      const templateKey = columnTemplateKeys[columnIndex - 1];
      if (!templateKey) {
        continue;
      }

      const normalizedContent = normalizeCellValue(row[columnIndex]);
      if (normalizedContent === null) {
        return {
          ok: false,
          error: `${weekLabel} · ${headerRow[columnIndex]} 셀 내용이 ${MAX_EXAM_PREP_WEEKLY_PLAN_ITEM_TITLE_LENGTH}자를 초과합니다.`,
        };
      }

      weekSubjects[templateKey] = normalizedContent;
      if (normalizedContent) {
        rowHasContent = true;
        filledCellCount += 1;
      }
    }

    if (rowHasContent || Object.keys(weekSubjects).length > 0) {
      weeks[String(ordinal)] = weekSubjects;
    }
  }

  if (Object.keys(weeks).length === 0) {
    return {
      ok: false,
      error: '불러올 공부계획 내용이 없습니다.',
      preview: {
        weekCount: 0,
        subjectCount: matchedSubjectCount,
        filledCellCount: 0,
        warnings,
      },
    };
  }

  return {
    ok: true,
    weeks,
    preview: {
      weekCount: countTemplateWeeksWithContent(weeks),
      subjectCount: countTemplateSubjectKeys(weeks),
      filledCellCount,
      warnings,
    },
  };
}

export async function exportExamPrepWeeklyPlanToExcel(
  input: ExamPrepExcelExportInput
): Promise<void> {
  const XLSX = await import('xlsx');
  const rows = buildExamPrepExcelSheetRows(input);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, '공부계획');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = buildExamPrepExcelFileName(input.roundLabel);
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function parseExamPrepWeeklyPlanExcelFile(
  file: File,
  subjects: UserSubject[],
  weekCount: number
): Promise<ParseExamPrepExcelResult> {
  if (!file.name.match(/\.xlsx?$/i)) {
    return {
      ok: false,
      error: '엑셀 파일(.xlsx, .xls)만 불러올 수 있습니다.',
    };
  }

  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return {
      ok: false,
      error: '엑셀 파일에 시트가 없습니다.',
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });

  return parseExamPrepExcelSheetRows(rows, subjects, weekCount);
}

export function applyExamPrepExcelImportToRound(
  plans: ExamPrepWeeklyPlans,
  weeks: Partial<Record<string, ExamPrepWeeklyPlanTemplateWeekSubjects>>,
  roundSlot: ExamRoundSlot,
  subjects: UserSubject[],
  weekCount: number,
  warnings: string[] = []
): ApplyExamPrepExcelImportResult {
  const result = applyTemplateToRound(
    plans,
    { weekCount, weeks },
    roundSlot,
    subjects,
    weekCount,
    'overwrite'
  );

  return {
    ...result,
    warnings,
  };
}
