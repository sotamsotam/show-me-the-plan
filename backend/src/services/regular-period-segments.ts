import {
  EXAM_ROUND_LABELS,
  EXAM_ROUND_SLOTS,
  getWeeksForSlot,
  resolvePrepPeriodStart,
  type ExamPrepWeeksByRound,
  type ExamRoundPreviewItem,
  type ExamRoundSlot,
} from './exam-countdown';
import {
  VACATION_PERIOD_SLOT_LABELS,
  type VacationPeriodSettings,
  type VacationPeriodSlot,
} from './vacation-period-settings';
import { listVacationWeekNumbers } from './vacation-week-date-range';
import type { VacationPeriod } from './school-term-periods';

export const REGULAR_PERIOD_SEGMENT_KEYS = [
  'after-winter-before-sem1-r1',
  'after-sem1-r1-before-sem1-r2',
  'after-sem1-r2-before-summer',
  'after-summer-before-sem2-r1',
  'after-sem2-r1-before-sem2-r2',
  'after-sem2-r2-before-winter',
] as const;

export type RegularPeriodSegmentKey = (typeof REGULAR_PERIOD_SEGMENT_KEYS)[number];

export const REGULAR_PERIOD_SEGMENT_LABELS: Record<RegularPeriodSegmentKey, string> = {
  'after-winter-before-sem1-r1': '겨울방학 후 ~ 1학기 1회차 시험대비 전',
  'after-sem1-r1-before-sem1-r2': '1학기 1회차 시험 후 ~ 1학기 2회차 시험대비 전',
  'after-sem1-r2-before-summer': '1학기 2회차 시험 후 ~ 여름방학 전',
  'after-summer-before-sem2-r1': '여름방학 후 ~ 2학기 1회차 시험대비 전',
  'after-sem2-r1-before-sem2-r2': '2학기 1회차 시험 후 ~ 2학기 2회차 시험대비 전',
  'after-sem2-r2-before-winter': '2학기 2회차 시험 후 ~ 겨울방학 전',
};

type BoundaryMarker =
  | `${VacationPeriodSlot}-vacation-start`
  | `${VacationPeriodSlot}-vacation-end`
  | `${ExamRoundSlot}-prep-start`
  | `${ExamRoundSlot}-prep-end`
  | `${ExamRoundSlot}-exam-start`
  | `${ExamRoundSlot}-exam-end`;

interface TaggedBlockedSpan {
  start: string;
  end: string;
  segmentStart: BoundaryMarker;
  segmentEnd: BoundaryMarker;
}

export interface RegularPeriodSegmentPreviewItem {
  periodKey: string;
  label: string;
  start: string;
  end: string;
  hasSchedule: true;
  weekCount: number;
}

export interface BuildRegularPeriodSegmentsInput {
  vacationPeriodSettings: VacationPeriodSettings;
  examRoundPreview: ExamRoundPreviewItem[];
  examPrepWeeksByRound: ExamPrepWeeksByRound;
}

const PERIOD_KEY_BY_BOUNDARIES: Partial<Record<string, RegularPeriodSegmentKey>> = {
  'winter-vacation-end|sem1-r1-prep-start': 'after-winter-before-sem1-r1',
  'sem1-r1-exam-end|sem1-r2-prep-start': 'after-sem1-r1-before-sem1-r2',
  'sem1-r2-exam-end|summer-vacation-start': 'after-sem1-r2-before-summer',
  'summer-vacation-end|sem2-r1-prep-start': 'after-summer-before-sem2-r1',
  'sem2-r1-exam-end|sem2-r2-prep-start': 'after-sem2-r1-before-sem2-r2',
  'sem2-r2-exam-end|winter-vacation-start': 'after-sem2-r2-before-winter',
};

function addDays(ymd: string, days: number): string {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6)) - 1;
  const day = Number(ymd.slice(6, 8));
  const date = new Date(year, month, day);
  date.setDate(date.getDate() + days);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function formatYmdLabel(ymd: string): string {
  return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}

function formatDateRangeLabel(start: string, end: string): string {
  if (start === end) {
    return formatYmdLabel(start);
  }

  return `${formatYmdLabel(start)} ~ ${formatYmdLabel(end)}`;
}

function collectBlockedSpans(input: BuildRegularPeriodSegmentsInput): TaggedBlockedSpan[] {
  const spans: TaggedBlockedSpan[] = [];

  for (const slot of ['summer', 'winter'] as const) {
    const range = input.vacationPeriodSettings[slot];
    if (!range) {
      continue;
    }

    spans.push({
      start: range.start,
      end: range.end,
      segmentStart: `${slot}-vacation-start`,
      segmentEnd: `${slot}-vacation-end`,
    });
  }

  for (const slot of EXAM_ROUND_SLOTS) {
    const preview = input.examRoundPreview.find((item) => item.slot === slot);
    if (!preview?.hasSchedule || !preview.firstDay || !preview.lastDay) {
      continue;
    }

    const weeksBefore = getWeeksForSlot(slot, input.examPrepWeeksByRound);
    const prepStart = resolvePrepPeriodStart(preview.firstDay, weeksBefore);
    const lastPrepDay = addDays(preview.firstDay, -1);

    if (prepStart <= lastPrepDay) {
      spans.push({
        start: prepStart,
        end: lastPrepDay,
        segmentStart: `${slot}-prep-start`,
        segmentEnd: `${slot}-prep-end`,
      });
    }

    spans.push({
      start: preview.firstDay,
      end: preview.lastDay,
      segmentStart: `${slot}-exam-start`,
      segmentEnd: `${slot}-exam-end`,
    });
  }

  return spans;
}

function mergeBlockedSpans(spans: TaggedBlockedSpan[]): TaggedBlockedSpan[] {
  if (spans.length === 0) {
    return [];
  }

  const sorted = [...spans].sort((left, right) => left.start.localeCompare(right.start));
  const merged: TaggedBlockedSpan[] = [{ ...sorted[0] }];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const last = merged[merged.length - 1];
    const isAdjacentOrOverlapping = addDays(last.end, 1) >= current.start;

    if (isAdjacentOrOverlapping) {
      if (current.end > last.end) {
        last.end = current.end;
        last.segmentEnd = current.segmentEnd;
      }
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
}

function resolvePeriodKey(
  leftEnd: BoundaryMarker,
  rightStart: BoundaryMarker,
  start: string,
  end: string
): string {
  const mapped = PERIOD_KEY_BY_BOUNDARIES[`${leftEnd}|${rightStart}`];
  if (mapped) {
    return mapped;
  }

  return `gap-${start}-${end}`;
}

function resolvePeriodLabel(periodKey: string, start: string, end: string): string {
  if (periodKey in REGULAR_PERIOD_SEGMENT_LABELS) {
    return REGULAR_PERIOD_SEGMENT_LABELS[periodKey as RegularPeriodSegmentKey];
  }

  return `평소 기간 (${formatDateRangeLabel(start, end)})`;
}

function previewItemFromPeriod(period: VacationPeriod, periodKey: string): RegularPeriodSegmentPreviewItem {
  return {
    periodKey,
    label: period.label,
    start: period.start,
    end: period.end,
    hasSchedule: true,
    weekCount: listVacationWeekNumbers(period).length,
  };
}

export function buildRegularPeriodSegmentPreview(
  input: BuildRegularPeriodSegmentsInput
): RegularPeriodSegmentPreviewItem[] {
  const blocked = mergeBlockedSpans(collectBlockedSpans(input));
  const segments: RegularPeriodSegmentPreviewItem[] = [];

  for (let index = 0; index < blocked.length - 1; index += 1) {
    const left = blocked[index];
    const right = blocked[index + 1];
    const start = addDays(left.end, 1);
    const end = addDays(right.start, -1);

    if (start > end) {
      continue;
    }

    const periodKey = resolvePeriodKey(left.segmentEnd, right.segmentStart, start, end);
    const label = resolvePeriodLabel(periodKey, start, end);
    const period: VacationPeriod = { label, start, end };

    if (listVacationWeekNumbers(period).length === 0) {
      continue;
    }

    segments.push(previewItemFromPeriod(period, periodKey));
  }

  return segments;
}

export interface BlockedPeriodSpanPreviewItem {
  periodKey: string;
  label: string;
  start: string;
  end: string;
  kind: 'vacation' | 'exam-prep' | 'exam';
}

function resolveBlockedSpanMeta(segmentStart: BoundaryMarker): {
  periodKey: string;
  label: string;
  kind: BlockedPeriodSpanPreviewItem['kind'];
} | null {
  for (const slot of ['summer', 'winter'] as const) {
    if (segmentStart === `${slot}-vacation-start`) {
      return {
        periodKey: `${slot}-vacation`,
        label: VACATION_PERIOD_SLOT_LABELS[slot],
        kind: 'vacation',
      };
    }
  }

  for (const slot of EXAM_ROUND_SLOTS) {
    if (segmentStart === `${slot}-prep-start`) {
      return {
        periodKey: `${slot}-prep`,
        label: `${EXAM_ROUND_LABELS[slot]} 시험대비`,
        kind: 'exam-prep',
      };
    }

    if (segmentStart === `${slot}-exam-start`) {
      return {
        periodKey: `${slot}-exam`,
        label: `${EXAM_ROUND_LABELS[slot]} 시험`,
        kind: 'exam',
      };
    }
  }

  return null;
}

export function buildBlockedPeriodSpanPreview(
  input: BuildRegularPeriodSegmentsInput
): BlockedPeriodSpanPreviewItem[] {
  return collectBlockedSpans(input)
    .flatMap((span) => {
      const meta = resolveBlockedSpanMeta(span.segmentStart);
      if (!meta) {
        return [];
      }

      return [
        {
          periodKey: meta.periodKey,
          label: meta.label,
          start: span.start,
          end: span.end,
          kind: meta.kind,
        },
      ];
    })
    .sort((left, right) => left.start.localeCompare(right.start));
}

export function previewItemToRegularPeriod(
  preview: RegularPeriodSegmentPreviewItem
): VacationPeriod {
  return {
    label: preview.label,
    start: preview.start,
    end: preview.end,
  };
}

export function resolveNearestRegularPeriodKey(
  preview: RegularPeriodSegmentPreviewItem[],
  todayYmd: string
): string | null {
  if (preview.length === 0) {
    return null;
  }

  const sorted = [...preview].sort((left, right) => left.start.localeCompare(right.start));
  const upcoming = sorted.find((item) => item.end >= todayYmd);

  return (upcoming ?? sorted[sorted.length - 1]).periodKey;
}

export function isRegularPeriodSegmentKey(value: string): value is RegularPeriodSegmentKey {
  return (REGULAR_PERIOD_SEGMENT_KEYS as readonly string[]).includes(value);
}

export function boundaryLabel(marker: BoundaryMarker): string {
  for (const slot of ['summer', 'winter'] as const) {
    if (marker === `${slot}-vacation-start`) {
      return `${VACATION_PERIOD_SLOT_LABELS[slot]} 시작`;
    }

    if (marker === `${slot}-vacation-end`) {
      return `${VACATION_PERIOD_SLOT_LABELS[slot]} 종료`;
    }
  }

  for (const slot of EXAM_ROUND_SLOTS) {
    const prefix = `${slot}-`;

    if (!marker.startsWith(prefix)) {
      continue;
    }

    const roundLabel = EXAM_ROUND_LABELS[slot];
    const kind = marker.slice(prefix.length);

    if (kind === 'prep-start') {
      return `${roundLabel} 시험대비 시작`;
    }

    if (kind === 'prep-end') {
      return `${roundLabel} 시험대비 종료`;
    }

    if (kind === 'exam-start') {
      return `${roundLabel} 시험 시작`;
    }

    if (kind === 'exam-end') {
      return `${roundLabel} 시험 종료`;
    }
  }

  return marker;
}
