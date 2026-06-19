export interface PeriodTime {
  start: string;
  end: string;
}

/** 초등학교 기본 교시 시간 (학교·학년마다 다를 수 있음) */
export const ELEMENTARY_SCHOOL_PERIOD_TIMES: Record<number, PeriodTime> = {
  1: { start: '09:00', end: '09:40' },
  2: { start: '09:50', end: '10:30' },
  3: { start: '10:40', end: '11:30' },
  4: { start: '11:40', end: '12:30' },
  5: { start: '13:20', end: '14:10' },
  6: { start: '14:20', end: '15:10' },
};

/** 중·고등학교 기본 교시 시간 (학교마다 다를 수 있음) */
export const MIDDLE_SCHOOL_PERIOD_TIMES: Record<number, PeriodTime> = {
  1: { start: '08:40', end: '09:30' },
  2: { start: '09:40', end: '10:30' },
  3: { start: '10:40', end: '11:30' },
  4: { start: '11:40', end: '12:30' },
  5: { start: '13:30', end: '14:20' },
  6: { start: '14:30', end: '15:20' },
  7: { start: '15:30', end: '16:20' },
};

export function getPeriodTimes(
  schoolLevel: string
): Record<number, PeriodTime> {
  if (schoolLevel === 'elementary') {
    return ELEMENTARY_SCHOOL_PERIOD_TIMES;
  }

  return MIDDLE_SCHOOL_PERIOD_TIMES;
}

export function ymdToIsoDate(ymd: string): string {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

/** YYYYMMDD 기준 토요일 여부 (0=일, 6=토) */
export function isSaturdayYmd(ymd: string): boolean {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6)) - 1;
  const day = Number(ymd.slice(6, 8));
  return new Date(year, month, day).getDay() === 6;
}
