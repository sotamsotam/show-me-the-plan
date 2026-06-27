export const DEFAULT_EXAM_PREP_WEEKS = 4;
export const MIN_EXAM_PREP_WEEKS = 1;
export const MAX_EXAM_PREP_WEEKS = 12;

export const EXAM_ROUND_SLOTS = [
  'sem1-r1',
  'sem1-r2',
  'sem2-r1',
  'sem2-r2',
] as const;

export type ExamRoundSlot = (typeof EXAM_ROUND_SLOTS)[number];

export const EXAM_ROUND_LABELS: Record<ExamRoundSlot, string> = {
  'sem1-r1': '1학기 1회차',
  'sem1-r2': '1학기 2회차',
  'sem2-r1': '2학기 1회차',
  'sem2-r2': '2학기 2회차',
};

export interface SchoolExamEventInput {
  date: string;
  title: string;
}

export interface SchoolHolidayEventInput {
  date: string;
  title: string;
}

export interface ExamCountdownResult {
  label: string;
  /** D-N prep week (0 during the exam week). */
  prepWeekNumber: number;
  daysRemaining: number;
  examDate: string;
}

export interface ExamGroup {
  label: string;
  firstDay: string;
  lastDay: string;
}

export interface ExamGroupWithSlot extends ExamGroup {
  roundSlot: ExamRoundSlot;
}

export interface ExamRoundPreviewItem {
  slot: ExamRoundSlot;
  label: string | null;
  firstDay: string | null;
  lastDay: string | null;
  hasSchedule: boolean;
}

export interface ExamPrepWeeksByRound {
  defaultWeeks: number;
  weeksBySlot: Record<ExamRoundSlot, number>;
}

export interface ExamPrepPeriod {
  label: string;
  prepStart: string;
  examFirstDay: string;
  prepEnd: string;
  roundSlot?: ExamRoundSlot;
}

export interface ExamPrepWeekDateRange {
  weekNumber: number;
  start: string;
  end: string;
}

const SUMMER_VACATION_PATTERN = /여름\s*방학|하계\s*방학/;
const VACATION_END_PATTERN = /개학|입학식/;
const SEM1_TITLE_PATTERN = /1\s*학기/;
const SEM2_TITLE_PATTERN = /2\s*학기/;
const ROUND1_TITLE_PATTERN =
  /1\s*회|1\s*차|중간\s*고사|중간고사|1\s*회\s*고사|1차\s*시험/i;
const ROUND2_TITLE_PATTERN =
  /2\s*회|2\s*차|기말\s*고사|기말고사|2\s*회\s*고사|2차\s*시험/i;

export function resolveExamPrepWeeksBefore(value: unknown): number {
  if (value === null || value === undefined) {
    return DEFAULT_EXAM_PREP_WEEKS;
  }

  const weeks = typeof value === 'number' ? value : Number(value);

  if (
    !Number.isInteger(weeks) ||
    weeks < MIN_EXAM_PREP_WEEKS ||
    weeks > MAX_EXAM_PREP_WEEKS
  ) {
    return DEFAULT_EXAM_PREP_WEEKS;
  }

  return weeks;
}

export function createDefaultExamPrepWeeksByRound(
  fallbackWeeks = DEFAULT_EXAM_PREP_WEEKS
): ExamPrepWeeksByRound {
  return {
    defaultWeeks: fallbackWeeks,
    weeksBySlot: {
      'sem1-r1': fallbackWeeks,
      'sem1-r2': fallbackWeeks,
      'sem2-r1': fallbackWeeks,
      'sem2-r2': fallbackWeeks,
    },
  };
}

export function resolveExamPrepWeeksByRound(
  value: unknown,
  legacyWeeksBefore?: unknown
): ExamPrepWeeksByRound {
  const fallback = resolveExamPrepWeeksBefore(legacyWeeksBefore);
  const defaults = createDefaultExamPrepWeeksByRound(fallback);

  if (!value || typeof value !== 'object') {
    return defaults;
  }

  const record = value as { weeksBySlot?: Record<string, unknown> };
  const weeksBySlot = { ...defaults.weeksBySlot };

  if (record.weeksBySlot && typeof record.weeksBySlot === 'object') {
    for (const slot of EXAM_ROUND_SLOTS) {
      const weeks = resolveExamPrepWeeksBefore(record.weeksBySlot[slot]);
      if (weeks !== DEFAULT_EXAM_PREP_WEEKS || record.weeksBySlot[slot] !== undefined) {
        weeksBySlot[slot] = weeks;
      }
    }
  }

  return {
    defaultWeeks: fallback,
    weeksBySlot,
  };
}

export function validateExamPrepWeeksByRoundInput(value: unknown): ExamPrepWeeksByRound | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as { weeksBySlot?: Record<string, unknown> };
  if (!record.weeksBySlot || typeof record.weeksBySlot !== 'object') {
    return null;
  }

  const weeksBySlot = {} as Record<ExamRoundSlot, number>;

  for (const slot of EXAM_ROUND_SLOTS) {
    const raw = record.weeksBySlot[slot];
    const weeks = typeof raw === 'number' ? raw : Number(raw);

    if (
      !Number.isInteger(weeks) ||
      weeks < MIN_EXAM_PREP_WEEKS ||
      weeks > MAX_EXAM_PREP_WEEKS
    ) {
      return null;
    }

    weeksBySlot[slot] = weeks;
  }

  return {
    defaultWeeks: DEFAULT_EXAM_PREP_WEEKS,
    weeksBySlot,
  };
}

export function normalizeExamGroupKey(title: string): string {
  return title
    .trim()
    .replace(/\s*\d+\s*일차\s*$/, '')
    .replace(/\s+/g, ' ');
}

function parseYmd(ymd: string): Date {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6)) - 1;
  const day = Number(ymd.slice(6, 8));
  return new Date(year, month, day);
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function addDays(ymd: string, days: number): string {
  const date = parseYmd(ymd);
  date.setDate(date.getDate() + days);
  return formatYmd(date);
}

function diffDays(fromYmd: string, toYmd: string): number {
  const from = parseYmd(fromYmd).getTime();
  const to = parseYmd(toYmd).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

interface ExamGroupInternal {
  label: string;
  firstDay: string;
  lastDay: string;
}

export function groupExamEvents(events: SchoolExamEventInput[]): ExamGroup[] {
  const sorted = [...events].sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
  );

  const groups: ExamGroupInternal[] = [];

  for (const event of sorted) {
    const title = event.title.trim();
    const key = normalizeExamGroupKey(title);
    const lastGroup = groups[groups.length - 1];

    if (
      lastGroup &&
      normalizeExamGroupKey(lastGroup.label) === key &&
      event.date === addDays(lastGroup.lastDay, 1)
    ) {
      lastGroup.lastDay = event.date;
      continue;
    }

    groups.push({
      label: title,
      firstDay: event.date,
      lastDay: event.date,
    });
  }

  return groups.map(({ label, firstDay, lastDay }) => ({ label, firstDay, lastDay }));
}

export function resolveSummerVacationPeriod(
  holidays: SchoolHolidayEventInput[]
): { start: string; end: string } | null {
  const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  const summerStart = sorted.find((holiday) =>
    SUMMER_VACATION_PATTERN.test(holiday.title)
  );

  if (!summerStart) {
    return null;
  }

  const endEvent = sorted.find(
    (holiday) =>
      holiday.date > summerStart.date && VACATION_END_PATTERN.test(holiday.title)
  );

  return {
    start: summerStart.date,
    end: endEvent ? addDays(endEvent.date, -1) : addDays(summerStart.date, 40),
  };
}

export function classifySemesterFromTitle(title: string): 1 | 2 | null {
  const trimmed = title.trim();
  if (SEM1_TITLE_PATTERN.test(trimmed)) {
    return 1;
  }
  if (SEM2_TITLE_PATTERN.test(trimmed)) {
    return 2;
  }
  return null;
}

export function classifyRoundFromTitle(title: string): 1 | 2 | null {
  const trimmed = title.trim();
  if (ROUND2_TITLE_PATTERN.test(trimmed)) {
    return 2;
  }
  if (ROUND1_TITLE_PATTERN.test(trimmed)) {
    return 1;
  }
  return null;
}

export function resolveSemesterFromDate(
  ymd: string,
  summerVacation: { start: string; end: string } | null
): 1 | 2 {
  if (summerVacation) {
    if (ymd < summerVacation.start) {
      return 1;
    }
    if (ymd > summerVacation.end) {
      return 2;
    }

    const month = Number(ymd.slice(4, 6));
    return month <= 7 ? 1 : 2;
  }

  const month = Number(ymd.slice(4, 6));
  return month < 8 ? 1 : 2;
}

function slotForSemesterRound(semester: 1 | 2, round: 1 | 2): ExamRoundSlot {
  return `${semester === 1 ? 'sem1' : 'sem2'}-r${round}` as ExamRoundSlot;
}

function assignSlotsForSemester(
  groups: ExamGroup[],
  semester: 1 | 2,
  summerVacation: { start: string; end: string } | null
): ExamGroupWithSlot[] {
  const slotR1 = slotForSemesterRound(semester, 1);
  const slotR2 = slotForSemesterRound(semester, 2);
  const sorted = [...groups].sort((a, b) => a.firstDay.localeCompare(b.firstDay));
  const slotByGroup = new Map<ExamGroup, ExamRoundSlot>();
  const taken = new Set<ExamRoundSlot>();

  for (const group of sorted) {
    const titleSemester = classifySemesterFromTitle(group.label);
    if (titleSemester !== null && titleSemester !== semester) {
      continue;
    }

    const round = classifyRoundFromTitle(group.label);
    if (!round) {
      continue;
    }

    const slot = slotForSemesterRound(semester, round);
    if (!taken.has(slot)) {
      slotByGroup.set(group, slot);
      taken.add(slot);
    }
  }

  const remaining = sorted.filter((group) => {
    if (slotByGroup.has(group)) {
      return false;
    }

    const titleSemester = classifySemesterFromTitle(group.label);
    return titleSemester === null || titleSemester === semester;
  });

  const available = ([slotR1, slotR2] as ExamRoundSlot[]).filter((slot) => !taken.has(slot));

  for (let index = 0; index < remaining.length && index < available.length; index += 1) {
    slotByGroup.set(remaining[index], available[index]);
    taken.add(available[index]);
  }

  return sorted
    .filter((group) => slotByGroup.has(group))
    .map((group) => ({
      ...group,
      roundSlot: slotByGroup.get(group)!,
    }));
}

export function assignExamRoundSlots(
  groups: ExamGroup[],
  holidays: SchoolHolidayEventInput[] = []
): ExamGroupWithSlot[] {
  const summerVacation = resolveSummerVacationPeriod(holidays);
  const sem1Groups: ExamGroup[] = [];
  const sem2Groups: ExamGroup[] = [];

  for (const group of groups) {
    const titleSemester = classifySemesterFromTitle(group.label);
    const semester =
      titleSemester ?? resolveSemesterFromDate(group.firstDay, summerVacation);

    if (semester === 1) {
      sem1Groups.push(group);
    } else {
      sem2Groups.push(group);
    }
  }

  return [
    ...assignSlotsForSemester(sem1Groups, 1, summerVacation),
    ...assignSlotsForSemester(sem2Groups, 2, summerVacation),
  ].sort((a, b) => a.firstDay.localeCompare(b.firstDay));
}

export function buildExamRoundPreview(
  groupsWithSlots: ExamGroupWithSlot[]
): ExamRoundPreviewItem[] {
  return EXAM_ROUND_SLOTS.map((slot) => {
    const group = groupsWithSlots.find((item) => item.roundSlot === slot);

    if (!group) {
      return {
        slot,
        label: null,
        firstDay: null,
        lastDay: null,
        hasSchedule: false,
      };
    }

    return {
      slot,
      label: group.label,
      firstDay: group.firstDay,
      lastDay: group.lastDay,
      hasSchedule: true,
    };
  });
}

export function resolveNearestScheduledRoundSlot(
  preview: ExamRoundPreviewItem[],
  todayYmd: string = todayYmdLocal()
): ExamRoundSlot {
  const scheduled = preview.filter(
    (item): item is ExamRoundPreviewItem & { firstDay: string } =>
      item.hasSchedule && Boolean(item.firstDay)
  );

  if (scheduled.length === 0) {
    return 'sem1-r1';
  }

  return scheduled.reduce((nearest, item) => {
    const nearestDistance = Math.abs(diffDays(todayYmd, nearest.firstDay));
    const itemDistance = Math.abs(diffDays(todayYmd, item.firstDay));

    if (itemDistance < nearestDistance) {
      return item;
    }

    if (
      itemDistance === nearestDistance &&
      item.firstDay >= todayYmd &&
      nearest.firstDay < todayYmd
    ) {
      return item;
    }

    return nearest;
  }).slot;
}

export function resolveExamCountdownYearDateRange(
  today = new Date()
): { fromDate: string; toDate: string } {
  const year = today.getFullYear();
  return {
    fromDate: `${year}0101`,
    toDate: `${year}1231`,
  };
}

export function getWeeksForSlot(
  slot: ExamRoundSlot,
  settings: ExamPrepWeeksByRound
): number {
  return settings.weeksBySlot[slot] ?? settings.defaultWeeks;
}

export function listPrepWeekNumbers(weeksBefore: number): number[] {
  if (
    !Number.isInteger(weeksBefore) ||
    weeksBefore < MIN_EXAM_PREP_WEEKS ||
    weeksBefore > MAX_EXAM_PREP_WEEKS
  ) {
    return [];
  }

  const weeks: number[] = [];
  for (let weekNumber = weeksBefore; weekNumber >= 1; weekNumber -= 1) {
    weeks.push(weekNumber);
  }
  return weeks;
}

export function formatPrepWeekLabel(weekNumber: number): string {
  if (weekNumber === 0) {
    return 'D-0주';
  }

  return `D-${weekNumber}주차`;
}

export function formatPrepDayLabel(daysRemaining: number): string {
  return `D-${daysRemaining}`;
}

function isDateInExamWeek(ymd: string, examFirstDay: string): boolean {
  const examWeekMonday = mondayOnOrBefore(examFirstDay);
  const examWeekSunday = addDays(examWeekMonday, 6);

  return ymd >= examWeekMonday && ymd <= examWeekSunday;
}

type ExamPrepWeekPeriodInput = Pick<ExamPrepPeriod, 'prepStart' | 'examFirstDay'>;

/** Monday on or before the given date (Mon-Sun week). */
export function mondayOnOrBefore(ymd: string): string {
  const day = parseYmd(ymd).getDay();
  const daysBack = (day + 6) % 7;
  return addDays(ymd, -daysBack);
}

/**
 * First Monday of the N-week exam prep window (D-N … D-1), aligned to calendar weeks.
 * D-1 is the Mon-Sun week immediately before the exam week.
 */
export function resolvePrepPeriodStart(examFirstDay: string, weeksBefore: number): string {
  const examWeekMonday = mondayOnOrBefore(examFirstDay);
  const d1Monday = addDays(examWeekMonday, -7);
  return addDays(d1Monday, -(weeksBefore - 1) * 7);
}

export function resolveExamPrepWeekPlanPeriodBounds(
  examFirstDay: string,
  weeksBefore: number
): { prepStart: string; lastPrepDay: string } {
  return {
    prepStart: resolvePrepPeriodStart(examFirstDay, weeksBefore),
    lastPrepDay: addDays(examFirstDay, -1),
  };
}

export function resolveExamPrepWeekPeriod(
  examFirstDay: string,
  weeksBefore: number
): ExamPrepWeekPeriodInput {
  return {
    prepStart: resolvePrepPeriodStart(examFirstDay, weeksBefore),
    examFirstDay,
  };
}

function isValidPrepWeeksBefore(weeksBefore: number): boolean {
  return (
    Number.isInteger(weeksBefore) &&
    weeksBefore >= MIN_EXAM_PREP_WEEKS &&
    weeksBefore <= MAX_EXAM_PREP_WEEKS
  );
}

export function resolvePrepWeekDateRange(
  period: ExamPrepWeekPeriodInput,
  weekNumber: number,
  weeksBefore: number
): ExamPrepWeekDateRange | null {
  if (!isValidPrepWeeksBefore(weeksBefore)) {
    return null;
  }

  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > weeksBefore) {
    return null;
  }

  const weekIndex = weeksBefore - weekNumber;
  const start = addDays(period.prepStart, weekIndex * 7);
  const lastPrepDay = addDays(period.examFirstDay, -1);

  if (start > lastPrepDay) {
    return null;
  }

  const nominalEnd = addDays(start, 6);
  const end =
    weekNumber === 1
      ? lastPrepDay
      : nominalEnd > lastPrepDay
        ? lastPrepDay
        : nominalEnd;

  return {
    weekNumber,
    start,
    end,
  };
}

export function resolvePrepWeekNumber(
  ymd: string,
  period: ExamPrepWeekPeriodInput,
  weeksBefore: number
): number | null {
  if (!isValidPrepWeeksBefore(weeksBefore)) {
    return null;
  }

  if (ymd < period.prepStart || ymd >= period.examFirstDay) {
    return null;
  }

  const daysFromStart = diffDays(period.prepStart, ymd);
  const weekIndex = Math.floor(daysFromStart / 7);

  if (weekIndex < 0) {
    return null;
  }

  if (weekIndex >= weeksBefore) {
    return isDateInPrepWeek(ymd, period, 1, weeksBefore) ? 1 : null;
  }

  return weeksBefore - weekIndex;
}

export function isDateInPrepWeek(
  ymd: string,
  period: ExamPrepWeekPeriodInput,
  weekNumber: number,
  weeksBefore: number
): boolean {
  const range = resolvePrepWeekDateRange(period, weekNumber, weeksBefore);
  if (!range) {
    return false;
  }

  return ymd >= range.start && ymd <= range.end;
}

function previewItemsWithSchedule(
  preview: ExamRoundPreviewItem[]
): Array<ExamRoundPreviewItem & { firstDay: string; lastDay: string; slot: ExamRoundSlot }> {
  return preview.filter(
    (
      item
    ): item is ExamRoundPreviewItem & {
      firstDay: string;
      lastDay: string;
      slot: ExamRoundSlot;
    } => item.hasSchedule && Boolean(item.firstDay) && Boolean(item.lastDay)
  );
}

export function resolveExamPrepPeriodsFromPreview(
  preview: ExamRoundPreviewItem[],
  settings: ExamPrepWeeksByRound
): ExamPrepPeriod[] {
  return previewItemsWithSchedule(preview).map((item) => {
    const weeksBefore = getWeeksForSlot(item.slot, settings);

    return {
      label: item.label ?? EXAM_ROUND_LABELS[item.slot],
      prepStart: resolvePrepPeriodStart(item.firstDay, weeksBefore),
      examFirstDay: item.firstDay,
      prepEnd: item.lastDay,
      roundSlot: item.slot,
    };
  });
}

/** Inclusive prep start through exam last day; `end` is exclusive for study-plan-todos API (ISO dates). */
export function resolveStudyPlanTodoQueryRangeForExamPrep(
  preview: ExamRoundPreviewItem[],
  settings: ExamPrepWeeksByRound
): { start: string; end: string } | null {
  const periods = resolveExamPrepPeriodsFromPreview(preview, settings);

  if (periods.length === 0) {
    return null;
  }

  let startYmd = periods[0]!.prepStart;
  let lastInclusiveDayYmd = periods[0]!.prepEnd;

  for (const period of periods) {
    if (period.prepStart < startYmd) {
      startYmd = period.prepStart;
    }
    if (period.prepEnd > lastInclusiveDayYmd) {
      lastInclusiveDayYmd = period.prepEnd;
    }
  }

  return {
    start: ymdToIsoDateForStudyPlanApi(startYmd),
    end: ymdToIsoDateForStudyPlanApi(addDays(lastInclusiveDayYmd, 1)),
  };
}

function ymdToIsoDateForStudyPlanApi(ymd: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return ymd;
  }

  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

export function resolveActiveExamCountdownFromPreview(
  preview: ExamRoundPreviewItem[],
  settings: ExamPrepWeeksByRound,
  todayYmd: string
): ExamCountdownResult | null {
  const scheduled = [...previewItemsWithSchedule(preview)].sort((left, right) =>
    left.firstDay.localeCompare(right.firstDay)
  );

  for (const item of scheduled) {
    const weeksBefore = getWeeksForSlot(item.slot, settings);
    const prepStart = resolvePrepPeriodStart(item.firstDay, weeksBefore);
    const period = { prepStart, examFirstDay: item.firstDay };
    const examWeekMonday = mondayOnOrBefore(item.firstDay);
    const label = item.label ?? EXAM_ROUND_LABELS[item.slot];

    if (isDateInExamWeek(todayYmd, item.firstDay)) {
      return {
        label,
        prepWeekNumber: 0,
        daysRemaining: diffDays(todayYmd, item.firstDay),
        examDate: item.firstDay,
      };
    }

    if (todayYmd >= prepStart && todayYmd < examWeekMonday) {
      const prepWeekNumber = resolvePrepWeekNumber(todayYmd, period, weeksBefore);
      if (prepWeekNumber !== null) {
        return {
          label,
          prepWeekNumber,
          daysRemaining: diffDays(todayYmd, item.firstDay),
          examDate: item.firstDay,
        };
      }
    }
  }

  return null;
}

export function resolveExamPrepPeriods(
  events: SchoolExamEventInput[],
  settings: ExamPrepWeeksByRound,
  holidays: SchoolHolidayEventInput[] = []
): ExamPrepPeriod[] {
  const groups = assignExamRoundSlots(groupExamEvents(events), holidays);

  return groups.map((group) => {
    const weeksBefore = getWeeksForSlot(group.roundSlot, settings);

    return {
      label: group.label,
      prepStart: resolvePrepPeriodStart(group.firstDay, weeksBefore),
      examFirstDay: group.firstDay,
      prepEnd: group.lastDay,
      roundSlot: group.roundSlot,
    };
  });
}

export function resolveExamPrepDaysRemaining(
  ymd: string,
  periods: ExamPrepPeriod[]
): number | null {
  for (const period of periods) {
    if (ymd >= period.prepStart && ymd <= period.examFirstDay) {
      return diffDays(ymd, period.examFirstDay);
    }
  }

  return null;
}

export function isDateInExamPrepPeriod(
  ymd: string,
  periods: ExamPrepPeriod[]
): boolean {
  return periods.some((period) => ymd >= period.prepStart && ymd <= period.prepEnd);
}

export function formatYmdLocal(date: Date): string {
  return formatYmd(date);
}

export function resolveActiveExamCountdown(
  events: SchoolExamEventInput[],
  settings: ExamPrepWeeksByRound,
  todayYmd: string,
  holidays: SchoolHolidayEventInput[] = []
): ExamCountdownResult | null {
  const groups = assignExamRoundSlots(groupExamEvents(events), holidays);

  for (const group of groups) {
    const weeksBefore = getWeeksForSlot(group.roundSlot, settings);
    const prepStart = resolvePrepPeriodStart(group.firstDay, weeksBefore);
    const period = { prepStart, examFirstDay: group.firstDay };
    const examWeekMonday = mondayOnOrBefore(group.firstDay);

    if (isDateInExamWeek(todayYmd, group.firstDay)) {
      return {
        label: group.label,
        prepWeekNumber: 0,
        daysRemaining: diffDays(todayYmd, group.firstDay),
        examDate: group.firstDay,
      };
    }

    if (todayYmd >= prepStart && todayYmd < examWeekMonday) {
      const prepWeekNumber = resolvePrepWeekNumber(todayYmd, period, weeksBefore);
      if (prepWeekNumber !== null) {
        return {
          label: group.label,
          prepWeekNumber,
          daysRemaining: diffDays(todayYmd, group.firstDay),
          examDate: group.firstDay,
        };
      }
    }
  }

  return null;
}

export function formatExamCountdownLabel(result: ExamCountdownResult): string {
  return `${formatPrepWeekLabel(result.prepWeekNumber)} (${result.label})`;
}

export function todayYmdLocal(date = new Date()): string {
  return formatYmd(date);
}

/** @deprecated Use resolveExamPrepPeriods with ExamPrepWeeksByRound */
export function resolveExamPrepPeriodsWithWeeks(
  events: SchoolExamEventInput[],
  weeksBefore: number
): ExamPrepPeriod[] {
  return resolveExamPrepPeriods(
    events,
    createDefaultExamPrepWeeksByRound(weeksBefore)
  );
}
