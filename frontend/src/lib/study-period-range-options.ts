import {
  buildBlockedPeriodSpanPreview,
  buildRegularPeriodSegmentPreview,
  type BuildRegularPeriodSegmentsInput,
} from '@/lib/regular-period-segments';
import { todayYmdLocal } from '@/lib/exam-countdown';
import { ymdToIsoDate } from '@/lib/period-times';

export type StudyPeriodRangeKind = 'vacation' | 'exam-prep' | 'exam' | 'regular';

export const STUDY_PERIOD_KIND_LABELS: Record<StudyPeriodRangeKind, string> = {
  vacation: '방학',
  'exam-prep': '시험대비',
  exam: '시험',
  regular: '평소',
};

export interface StudyPeriodRangeOption {
  key: string;
  label: string;
  start: string;
  end: string;
  kind: StudyPeriodRangeKind;
}

function formatYmdLabel(ymd: string): string {
  return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}

export function formatStudyPeriodDateRange(start: string, end: string): string {
  if (start === end) {
    return formatYmdLabel(start);
  }

  return `${formatYmdLabel(start)} ~ ${formatYmdLabel(end)}`;
}

export function formatStudyPeriodOptionLabel(option: StudyPeriodRangeOption): string {
  return `${option.label} (${formatStudyPeriodDateRange(option.start, option.end)})`;
}

export function buildStudyPeriodRangeOptions(
  input: BuildRegularPeriodSegmentsInput
): StudyPeriodRangeOption[] {
  const blocked = buildBlockedPeriodSpanPreview(input).map((item) => ({
    key: item.periodKey,
    label: item.label,
    start: item.start,
    end: item.end,
    kind: item.kind,
  }));

  const regular = buildRegularPeriodSegmentPreview(input).map((item) => ({
    key: `regular-${item.periodKey}`,
    label: item.label,
    start: item.start,
    end: item.end,
    kind: 'regular' as const,
  }));

  return [...blocked, ...regular].sort((left, right) => left.start.localeCompare(right.start));
}

export function isoDateToYmd(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

export function studyPeriodRangeToIsoRange(option: Pick<StudyPeriodRangeOption, 'start' | 'end'>): {
  start: string;
  end: string;
} {
  return {
    start: ymdToIsoDate(option.start),
    end: ymdToIsoDate(option.end),
  };
}

export function findMatchingStudyPeriodKey(
  options: StudyPeriodRangeOption[],
  rangeStart: string,
  rangeEnd: string
): string {
  const startYmd = isoDateToYmd(rangeStart);
  const endYmd = isoDateToYmd(rangeEnd);

  return options.find((option) => option.start === startYmd && option.end === endYmd)?.key ?? '';
}

export function findStudyPeriodOptionContainingDate(
  options: StudyPeriodRangeOption[],
  ymd: string = todayYmdLocal()
): StudyPeriodRangeOption | null {
  return options.find((option) => option.start <= ymd && ymd <= option.end) ?? null;
}

export function resolveDefaultStudyPeriodRange(
  options: StudyPeriodRangeOption[],
  ymd: string = todayYmdLocal()
): { periodKey: string; start: string; end: string } | null {
  const option = findStudyPeriodOptionContainingDate(options, ymd);
  if (!option) {
    return null;
  }

  const { start, end } = studyPeriodRangeToIsoRange(option);
  return {
    periodKey: option.key,
    start,
    end,
  };
}

export function resolvePreviousStudyPeriodOption(
  options: StudyPeriodRangeOption[],
  currentKey: string
): StudyPeriodRangeOption | null {
  if (!currentKey) {
    return null;
  }

  const sorted = [...options].sort((left, right) => left.start.localeCompare(right.start));
  const currentIndex = sorted.findIndex((option) => option.key === currentKey);

  if (currentIndex <= 0) {
    return null;
  }

  return sorted[currentIndex - 1] ?? null;
}

export function resolveCurrentStudyPeriodOption(
  options: StudyPeriodRangeOption[],
  selectedPeriodKey: string,
  rangeStart: string,
  rangeEnd: string
): StudyPeriodRangeOption | null {
  if (selectedPeriodKey) {
    return options.find((option) => option.key === selectedPeriodKey) ?? null;
  }

  const matchedKey = findMatchingStudyPeriodKey(options, rangeStart, rangeEnd);

  if (!matchedKey) {
    return null;
  }

  return options.find((option) => option.key === matchedKey) ?? null;
}

/** 동일 kind(시험대비·방학·평소·시험)의 직전 구간을 비교 대상으로 반환 */
export function resolvePreviousMatchingStudyPeriodOption(
  options: StudyPeriodRangeOption[],
  currentKey: string
): StudyPeriodRangeOption | null {
  if (!currentKey) {
    return null;
  }

  const current = options.find((option) => option.key === currentKey);

  if (!current) {
    return null;
  }

  const previousSameKind = options
    .filter(
      (option) => option.kind === current.kind && option.start < current.start
    )
    .sort((left, right) => left.start.localeCompare(right.start));

  return previousSameKind.at(-1) ?? null;
}
