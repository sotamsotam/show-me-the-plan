import type { VacationPeriod } from '@/lib/school-term-periods';
import { listVacationWeekNumbers } from '@/lib/vacation-week-date-range';
import type { VacationPeriodPreviewItem } from '@/lib/vacation-weekly-plan';

export const VACATION_PERIOD_SLOTS = ['summer', 'winter'] as const;

export type VacationPeriodSlot = (typeof VACATION_PERIOD_SLOTS)[number];

export const VACATION_PERIOD_SLOT_LABELS: Record<VacationPeriodSlot, string> = {
  summer: '여름방학',
  winter: '겨울방학',
};

export interface VacationPeriodRange {
  start: string;
  end: string;
}

export interface VacationPeriodSettings {
  summer: VacationPeriodRange | null;
  winter: VacationPeriodRange | null;
}

export type NeisVacationSuggestion = Partial<VacationPeriodRange>;

export interface NeisVacationSuggestions {
  summer: NeisVacationSuggestion | null;
  winter: NeisVacationSuggestion | null;
}

export interface VacationPeriodSettingsResponse {
  vacationPeriodSettings: VacationPeriodSettings;
  neisVacationSuggestions: NeisVacationSuggestions;
}

export interface VacationPeriodSettingsSaveResponse {
  vacationPeriodSettings: VacationPeriodSettings;
}

const SUMMER_VACATION_PATTERN = /여름\s*방학|하계\s*방학/;
const WINTER_VACATION_PATTERN = /겨울\s*방학|동계\s*방학/;
const VACATION_START_PATTERN = /방학|종업식/;
const VACATION_END_PATTERN = /개학|입학식/;

const MAX_VACATION_PERIOD_DAYS = 90;

export type SlotDateInputs = Record<VacationPeriodSlot, { start: string; end: string }>;

export function createEmptySlotDateInputs(): SlotDateInputs {
  return {
    summer: { start: '', end: '' },
    winter: { start: '', end: '' },
  };
}

function todayYmdLocal(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function isVacationPeriodSlot(value: string): value is VacationPeriodSlot {
  return (VACATION_PERIOD_SLOTS as readonly string[]).includes(value);
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

function addDays(ymd: string, days: number): string {
  const date = parseYmd(ymd);
  if (!date) {
    return ymd;
  }

  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
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

function normalizeRange(value: unknown): VacationPeriodRange | null {
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
  if (!Number.isFinite(spanDays) || spanDays > MAX_VACATION_PERIOD_DAYS) {
    return null;
  }

  return { start, end };
}

export function createEmptyVacationPeriodSettings(): VacationPeriodSettings {
  return {
    summer: null,
    winter: null,
  };
}

export function resolveVacationPeriodSettings(value: unknown): VacationPeriodSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createEmptyVacationPeriodSettings();
  }

  const record = value as Record<string, unknown>;

  return {
    summer: normalizeRange(record.summer),
    winter: normalizeRange(record.winter),
  };
}

export function ymdToIsoDate(ymd: string): string {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

export function isoDateToYmd(value: string): string | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const ymd = `${match[1]}${match[2]}${match[3]}`;
  return parseYmd(ymd) ? ymd : null;
}

export function buildVacationPeriodPreviewFromSettings(
  settings: VacationPeriodSettings
): VacationPeriodPreviewItem[] {
  const preview: VacationPeriodPreviewItem[] = [];

  for (const slot of VACATION_PERIOD_SLOTS) {
    const range = settings[slot];
    if (!range) {
      continue;
    }

    const period: VacationPeriod = {
      label: VACATION_PERIOD_SLOT_LABELS[slot],
      start: range.start,
      end: range.end,
    };

    preview.push({
      slot,
      periodKey: slot,
      label: period.label,
      start: period.start,
      end: period.end,
      hasSchedule: true,
      weekCount: listVacationWeekNumbers(period).length,
    });
  }

  return preview;
}

export function settingsToVacationPeriods(settings: VacationPeriodSettings): VacationPeriod[] {
  return buildVacationPeriodPreviewFromSettings(settings).map((item) => ({
    label: item.label,
    start: item.start,
    end: item.end,
  }));
}

export function resolveNearestVacationPeriodSlot(
  preview: VacationPeriodPreviewItem[],
  todayYmd: string
): VacationPeriodSlot | null {
  if (preview.length === 0) {
    return null;
  }

  const sorted = [...preview].sort((left, right) => left.start.localeCompare(right.start));
  const upcoming = sorted.find((item) => item.end >= todayYmd);

  return (upcoming ?? sorted[sorted.length - 1]).slot;
}

function inferSlotFromLegacyStart(startYmd: string): VacationPeriodSlot | null {
  const month = Number(startYmd.slice(4, 6));

  if (month >= 6 && month <= 8) {
    return 'summer';
  }

  if (month === 12 || month <= 2) {
    return 'winter';
  }

  return null;
}

export function migrateLegacyVacationWeeklyPlanKey(periodKey: string): VacationPeriodSlot | null {
  if (isVacationPeriodSlot(periodKey)) {
    return periodKey;
  }

  if (isYmd(periodKey)) {
    return inferSlotFromLegacyStart(periodKey);
  }

  return null;
}

export function mergeSettingsWithNeisSuggestions(
  settings: VacationPeriodSettings,
  suggestions: NeisVacationSuggestions
): VacationPeriodSettings {
  const draft = createEmptyVacationPeriodSettings();

  for (const slot of VACATION_PERIOD_SLOTS) {
    if (settings[slot]) {
      draft[slot] = settings[slot];
      continue;
    }

    const suggestion = suggestions[slot];
    if (!suggestion?.start || !suggestion?.end) {
      draft[slot] = null;
      continue;
    }

    draft[slot] = normalizeRange(suggestion);
  }

  return draft;
}

export function shouldPreferNeisSuggestionOverSaved(
  slot: VacationPeriodSlot,
  saved: VacationPeriodRange,
  suggestion: NeisVacationSuggestion | null,
  referenceYmd: string = todayYmdLocal()
): boolean {
  if (!suggestion?.start) {
    return false;
  }

  if (slot !== 'winter') {
    return saved.end < referenceYmd && suggestion.start >= referenceYmd;
  }

  const refMonth = Number(referenceYmd.slice(4, 6));
  const savedMonth = Number(saved.start.slice(4, 6));
  const neisMonth = Number(suggestion.start.slice(4, 6));

  if (refMonth >= 3 && refMonth <= 11 && neisMonth === 12 && savedMonth <= 2) {
    return true;
  }

  if (saved.end < referenceYmd && suggestion.start >= referenceYmd) {
    return true;
  }

  if (neisMonth === 12 && savedMonth <= 2 && suggestion.start !== saved.start && refMonth >= 3) {
    return true;
  }

  return false;
}

export function isStaleSavedWinterVacation(
  saved: VacationPeriodRange,
  referenceYmd: string = todayYmdLocal()
): boolean {
  const refMonth = Number(referenceYmd.slice(4, 6));
  const refYear = referenceYmd.slice(0, 4);
  const savedStartMonth = Number(saved.start.slice(4, 6));
  const savedStartYear = saved.start.slice(0, 4);

  if (refMonth >= 3 && refMonth <= 11) {
    if (saved.end < referenceYmd) {
      return true;
    }

    if (savedStartMonth <= 2 && savedStartYear === refYear) {
      return true;
    }
  }

  if (refMonth === 12 && saved.end < referenceYmd) {
    if (savedStartMonth <= 2 && savedStartYear === refYear) {
      return true;
    }
  }

  return false;
}

function applyNeisSuggestionToSlotInputs(
  inputs: SlotDateInputs,
  slot: VacationPeriodSlot,
  suggestion: NeisVacationSuggestion | null
): void {
  inputs[slot] = { start: '', end: '' };

  if (!suggestion) {
    return;
  }

  if (suggestion.start) {
    inputs[slot].start = rangeToDateInputs({
      start: suggestion.start,
      end: suggestion.start,
    }).start;
  }

  if (suggestion.end) {
    inputs[slot].end = rangeToDateInputs({
      start: suggestion.end,
      end: suggestion.end,
    }).end;
  }
}

export function buildSlotDateInputsFromSettingsAndSuggestions(
  savedSettings: VacationPeriodSettings,
  suggestions: NeisVacationSuggestions,
  referenceYmd: string = todayYmdLocal()
): SlotDateInputs {
  const inputs = createEmptySlotDateInputs();

  for (const slot of VACATION_PERIOD_SLOTS) {
    const savedRaw = savedSettings[slot];
    const saved =
      slot === 'winter' && savedRaw && isStaleSavedWinterVacation(savedRaw, referenceYmd)
        ? null
        : savedRaw;
    const suggestion = suggestions[slot];

    if (saved && !shouldPreferNeisSuggestionOverSaved(slot, saved, suggestion, referenceYmd)) {
      inputs[slot] = rangeToDateInputs(saved);
      continue;
    }

    applyNeisSuggestionToSlotInputs(inputs, slot, suggestion);
  }

  return inputs;
}

export function draftRangeFromInputs(
  startInput: string,
  endInput: string
): VacationPeriodRange | null {
  const start = isoDateToYmd(startInput);
  const end = isoDateToYmd(endInput);

  if (!start || !end) {
    return null;
  }

  return normalizeRange({ start, end });
}

export function rangeToDateInputs(range: VacationPeriodRange | null): {
  start: string;
  end: string;
} {
  if (!range) {
    return { start: '', end: '' };
  }

  return {
    start: ymdToIsoDate(range.start),
    end: ymdToIsoDate(range.end),
  };
}
