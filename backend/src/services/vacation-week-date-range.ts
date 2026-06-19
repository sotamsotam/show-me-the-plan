import { mondayOnOrBefore } from './exam-countdown';
import type { VacationPeriod } from './school-term-periods';

export interface VacationWeekDateRange {
  weekNumber: number;
  start: string;
  end: string;
}

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

export function listVacationWeekNumbers(period: VacationPeriod): number[] {
  const periodStartMonday = mondayOnOrBefore(period.start);
  const weeks: number[] = [];
  let weekNumber = 1;
  let cursor = periodStartMonday;

  while (cursor <= period.end) {
    weeks.push(weekNumber);
    weekNumber += 1;
    cursor = addDays(cursor, 7);
  }

  return weeks;
}

export function resolveVacationWeekDateRange(
  period: VacationPeriod,
  weekNumber: number
): VacationWeekDateRange | null {
  if (!Number.isInteger(weekNumber) || weekNumber < 1) {
    return null;
  }

  const periodStartMonday = mondayOnOrBefore(period.start);
  const nominalStart = addDays(periodStartMonday, (weekNumber - 1) * 7);

  if (nominalStart > period.end) {
    return null;
  }

  const nominalEnd = addDays(nominalStart, 6);
  const start = nominalStart < period.start ? period.start : nominalStart;
  const end = nominalEnd > period.end ? period.end : nominalEnd;

  return {
    weekNumber,
    start,
    end,
  };
}
