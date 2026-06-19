import type { SchoolHolidayEventInput } from './school-term-periods';
import { listVacationWeekNumbers } from './vacation-week-date-range';
import type { VacationPeriodPreviewItem } from './vacation-weekly-plan';

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

const SUMMER_VACATION_PATTERN = /여름\s*방학|하계\s*방학/;
const WINTER_VACATION_PATTERN = /겨울\s*방학|동계\s*방학/;
const VACATION_START_PATTERN = /방학|종업식/;
const VACATION_END_PATTERN = /개학|입학식/;

const MAX_VACATION_PERIOD_DAYS = 90;
const MAX_WINTER_VACATION_GAP_DAYS = 120;

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

export function createEmptyVacationPeriodSettings(): VacationPeriodSettings {
  return {
    summer: null,
    winter: null,
  };
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

function findVacationEndEvent(
  holidays: SchoolHolidayEventInput[],
  startDate: string,
  slot?: VacationPeriodSlot
): SchoolHolidayEventInput | undefined {
  return [...holidays]
    .sort((a, b) => a.date.localeCompare(b.date))
    .find((holiday) => {
      if (holiday.date <= startDate || !VACATION_END_PATTERN.test(holiday.title)) {
        return false;
      }

      if (slot === 'winter') {
        const gapDays = diffDays(startDate, holiday.date);
        if (!Number.isFinite(gapDays) || gapDays > MAX_WINTER_VACATION_GAP_DAYS) {
          return false;
        }
      }

      return true;
    });
}

function isWinterStartMonth(ymd: string): boolean {
  const month = Number(ymd.slice(4, 6));
  return month === 12 || month <= 2;
}

function selectSummerVacationStart(
  sorted: SchoolHolidayEventInput[],
  fallbackStarts: SchoolHolidayEventInput[]
): SchoolHolidayEventInput | undefined {
  const summerTagged = sorted.filter((holiday) => SUMMER_VACATION_PATTERN.test(holiday.title));
  if (summerTagged.length > 0) {
    return summerTagged[0];
  }

  return fallbackStarts.find((holiday) => {
    const month = Number(holiday.date.slice(4, 6));
    return month >= 6 && month <= 8;
  });
}

function selectWinterVacationStart(
  sorted: SchoolHolidayEventInput[],
  fallbackStarts: SchoolHolidayEventInput[],
  referenceYmd: string
): SchoolHolidayEventInput | undefined {
  const winterTagged = sorted.filter((holiday) => WINTER_VACATION_PATTERN.test(holiday.title));
  const candidates =
    winterTagged.length > 0
      ? winterTagged
      : fallbackStarts.filter((holiday) => isWinterStartMonth(holiday.date));

  if (candidates.length === 0) {
    return undefined;
  }

  const refYear = referenceYmd.slice(0, 4);
  const refMonth = Number(referenceYmd.slice(4, 6));

  if (refMonth >= 3 && refMonth <= 11) {
    const decemberSameYear = candidates.find(
      (holiday) => holiday.date.startsWith(refYear) && holiday.date.slice(4, 6) === '12'
    );
    if (decemberSameYear) {
      return decemberSameYear;
    }

    const upcoming = candidates.find((holiday) => holiday.date >= referenceYmd);
    if (upcoming) {
      return upcoming;
    }
  }

  if (refMonth === 12) {
    const decemberCandidates = candidates.filter(
      (holiday) => holiday.date.startsWith(refYear) && holiday.date.slice(4, 6) === '12'
    );
    const started = decemberCandidates.find((holiday) => holiday.date <= referenceYmd);
    if (started) {
      return started;
    }
    if (decemberCandidates[0]) {
      return decemberCandidates[0];
    }
  }

  if (refMonth <= 2) {
    const currentSeason = candidates
      .filter((holiday) => holiday.date <= referenceYmd)
      .sort((left, right) => right.date.localeCompare(left.date))[0];
    if (currentSeason) {
      return currentSeason;
    }
  }

  const upcoming = candidates.find((holiday) => holiday.date >= referenceYmd);
  if (upcoming) {
    return upcoming;
  }

  return candidates[candidates.length - 1];
}

function buildVacationSuggestion(
  holidays: SchoolHolidayEventInput[],
  startEvent: SchoolHolidayEventInput | undefined,
  slot: VacationPeriodSlot
): NeisVacationSuggestion | null {
  if (!startEvent) {
    return null;
  }

  const endEvent = findVacationEndEvent(holidays, startEvent.date, slot);

  return {
    start: startEvent.date,
    ...(endEvent ? { end: addDays(endEvent.date, -1) } : {}),
  };
}

export function buildNeisVacationSuggestions(
  holidays: SchoolHolidayEventInput[],
  referenceYmd: string = todayYmdLocal()
): NeisVacationSuggestions {
  const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  const fallbackStarts = sorted.filter((holiday) => VACATION_START_PATTERN.test(holiday.title));

  const resolvedSummer = buildVacationSuggestion(
    sorted,
    selectSummerVacationStart(sorted, fallbackStarts),
    'summer'
  );

  const resolvedWinter = buildVacationSuggestion(
    sorted,
    selectWinterVacationStart(sorted, fallbackStarts, referenceYmd),
    'winter'
  );

  return {
    summer: resolvedSummer,
    winter: resolvedWinter,
  };
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

    const period = {
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

export function validateVacationPeriodSettingsInput(
  value: unknown
): { settings: VacationPeriodSettings } | { error: string } {
  if (value === null || value === undefined) {
    return { settings: createEmptyVacationPeriodSettings() };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'vacationPeriodSettings 형식이 올바르지 않습니다.' };
  }

  const record = value as Record<string, unknown>;
  const settings = createEmptyVacationPeriodSettings();

  for (const [key, slotValue] of Object.entries(record)) {
    if (!isVacationPeriodSlot(key)) {
      return { error: `지원하지 않는 방학 구분입니다: ${key}` };
    }

    if (slotValue === null || slotValue === undefined) {
      settings[key] = null;
      continue;
    }

    const range = normalizeRange(slotValue);
    if (!range) {
      return {
        error: `${VACATION_PERIOD_SLOT_LABELS[key]} 시작일과 종료일을 올바르게 입력해 주세요.`,
      };
    }

    settings[key] = range;
  }

  return { settings };
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
