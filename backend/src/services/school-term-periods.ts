export interface SchoolHolidayEventInput {
  date: string;
  title: string;
}

export interface VacationPeriod {
  label: string;
  start: string;
  end: string;
}

const VACATION_START_PATTERN = /방학|종업식/;
const VACATION_END_PATTERN = /개학|입학식/;

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

function isWeekday(ymd: string): boolean {
  const day = parseYmd(ymd).getDay();
  return day !== 0 && day !== 6;
}

function mergeOverlappingVacationPeriods(periods: VacationPeriod[]): VacationPeriod[] {
  if (periods.length === 0) {
    return [];
  }

  const sorted = [...periods].sort((a, b) => a.start.localeCompare(b.start));
  const merged: VacationPeriod[] = [{ ...sorted[0] }];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const last = merged[merged.length - 1];

    if (current.start <= addDays(last.end, 1)) {
      if (current.end > last.end) {
        last.end = current.end;
      }
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
}

export function extractSchoolClassDatesFromTimetableEntries(
  entries: ReadonlyArray<{ date: string }>
): Set<string> {
  const dates = new Set<string>();

  for (const entry of entries) {
    if (entry.date) {
      dates.add(entry.date);
    }
  }

  return dates;
}

export function resolveVacationPeriods(
  holidays: SchoolHolidayEventInput[],
  schoolClassDates: Set<string>
): VacationPeriod[] {
  const sortedHolidays = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  const periods: VacationPeriod[] = [];

  for (const event of sortedHolidays) {
    if (!VACATION_START_PATTERN.test(event.title)) {
      continue;
    }

    const start = event.date;
    let end = start;

    const endEvent = sortedHolidays.find(
      (holiday) => holiday.date > start && VACATION_END_PATTERN.test(holiday.title)
    );

    if (endEvent) {
      end = addDays(endEvent.date, -1);
    } else {
      let cursor = start;

      for (let step = 0; step < 90; step += 1) {
        const next = addDays(cursor, 1);
        const hasSchoolClass = isWeekday(next) && schoolClassDates.has(next);
        const hasLaterVacationStart = sortedHolidays.some(
          (holiday) =>
            holiday.date === next &&
            holiday.date !== start &&
            VACATION_START_PATTERN.test(holiday.title)
        );

        if (hasSchoolClass || hasLaterVacationStart) {
          break;
        }

        cursor = next;
      }

      end = cursor;
    }

    if (end >= start) {
      periods.push({
        label: event.title,
        start,
        end,
      });
    }
  }

  return mergeOverlappingVacationPeriods(periods);
}
