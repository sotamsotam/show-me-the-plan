import {
  EXAM_ROUND_LABELS,
  EXAM_ROUND_SLOTS,
  type ExamRoundPreviewItem,
  type ExamRoundSlot,
} from './exam-countdown';

export interface ExamPeriodRange {
  start: string;
  end: string;
}

export type ExamPeriodSettings = Record<ExamRoundSlot, ExamPeriodRange | null>;

export type NeisExamSuggestion = Partial<ExamPeriodRange & { label: string }>;

export type NeisExamSuggestions = Record<ExamRoundSlot, NeisExamSuggestion | null>;

const MAX_EXAM_PERIOD_DAYS = 14;

function isExamRoundSlot(value: string): value is ExamRoundSlot {
  return (EXAM_ROUND_SLOTS as readonly string[]).includes(value);
}

function isYmd(value: string): boolean {
  return /^\d{8}$/.test(value);
}

function parseYmd(ymd: string): Date | null {
  if (!isYmd(ymd)) {
    return null;
  }

  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6)) - 1;
  const day = Number(ymd.slice(6, 8));
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function diffDays(startYmd: string, endYmd: string): number {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);

  if (!start || !end) {
    return Number.NaN;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

function normalizeYmd(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!isYmd(trimmed) || !parseYmd(trimmed)) {
    return null;
  }

  return trimmed;
}

function normalizeRange(value: unknown): ExamPeriodRange | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const start = normalizeYmd((value as { start?: unknown }).start);
  const end = normalizeYmd((value as { end?: unknown }).end);

  if (!start || !end) {
    return null;
  }

  if (start > end) {
    return null;
  }

  const spanDays = diffDays(start, end);
  if (!Number.isFinite(spanDays) || spanDays > MAX_EXAM_PERIOD_DAYS) {
    return null;
  }

  return { start, end };
}

export function createEmptyExamPeriodSettings(): ExamPeriodSettings {
  return EXAM_ROUND_SLOTS.reduce(
    (settings, slot) => {
      settings[slot] = null;
      return settings;
    },
    {} as ExamPeriodSettings
  );
}

export function createEmptyNeisExamSuggestions(): NeisExamSuggestions {
  return EXAM_ROUND_SLOTS.reduce(
    (suggestions, slot) => {
      suggestions[slot] = null;
      return suggestions;
    },
    {} as NeisExamSuggestions
  );
}

export function resolveExamPeriodSettings(value: unknown): ExamPeriodSettings {
  const settings = createEmptyExamPeriodSettings();

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return settings;
  }

  const record = value as Record<string, unknown>;

  for (const slot of EXAM_ROUND_SLOTS) {
    settings[slot] = normalizeRange(record[slot]);
  }

  return settings;
}

export function buildNeisExamSuggestionsFromPreview(
  preview: ExamRoundPreviewItem[]
): NeisExamSuggestions {
  const suggestions = createEmptyNeisExamSuggestions();

  for (const slot of EXAM_ROUND_SLOTS) {
    const item = preview.find((entry) => entry.slot === slot);

    if (!item?.hasSchedule || !item.firstDay) {
      continue;
    }

    suggestions[slot] = {
      start: item.firstDay,
      ...(item.lastDay ? { end: item.lastDay } : {}),
      ...(item.label ? { label: item.label } : {}),
    };
  }

  return suggestions;
}

export function resolveEffectiveExamRoundPreview(
  settings: ExamPeriodSettings,
  neisPreview: ExamRoundPreviewItem[]
): ExamRoundPreviewItem[] {
  return EXAM_ROUND_SLOTS.map((slot) => {
    const saved = settings[slot];
    const neis = neisPreview.find((item) => item.slot === slot);

    if (saved) {
      return {
        slot,
        label: neis?.label ?? null,
        firstDay: saved.start,
        lastDay: saved.end,
        hasSchedule: true,
      };
    }

    if (neis?.hasSchedule && neis.firstDay && neis.lastDay) {
      return neis;
    }

    return {
      slot,
      label: null,
      firstDay: null,
      lastDay: null,
      hasSchedule: false,
    };
  });
}

export function validateExamPeriodSettingsInput(
  value: unknown
): { settings: ExamPeriodSettings } | { error: string } {
  if (value === null || value === undefined) {
    return { settings: createEmptyExamPeriodSettings() };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'examPeriodSettings 형식이 올바르지 않습니다.' };
  }

  const record = value as Record<string, unknown>;
  const settings = createEmptyExamPeriodSettings();

  for (const [key, slotValue] of Object.entries(record)) {
    if (!isExamRoundSlot(key)) {
      return { error: `지원하지 않는 시험 회차입니다: ${key}` };
    }

    if (slotValue === null || slotValue === undefined) {
      settings[key] = null;
      continue;
    }

    const range = normalizeRange(slotValue);
    if (!range) {
      return {
        error: `${EXAM_ROUND_LABELS[key]} 시험 시작일과 종료일을 올바르게 입력해 주세요.`,
      };
    }

    settings[key] = range;
  }

  return { settings };
}
