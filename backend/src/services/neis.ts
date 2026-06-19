import {
  buildTimetableCacheKey,
  getCachedTimetableBundle,
  getTimetableCacheTtlMs,
  isNeisCacheEnabled,
  recordTimetableCacheHit,
  recordTimetableCacheMiss,
  setCachedTimetableBundle,
} from './neis-cache';

const NEIS_BASE_URL = 'https://open.neis.go.kr/hub';

const SCHOOL_KIND_LABEL: Record<string, string> = {
  elementary: '초등학교',
  middle: '중학교',
  high: '고등학교',
};

type NeisRow = Record<string, string>;

interface NeisParseResult {
  rows: NeisRow[];
  code: string;
  message: string;
}

function getNeisKey(): string {
  const key = process.env.NEIS_KEY;
  if (!key) {
    throw new Error('NEIS_KEY가 설정되지 않았습니다.');
  }
  return key;
}

function parseNeisResponse(data: Record<string, unknown>, key: string): NeisParseResult {
  const blocks = data[key] as Array<{ head?: unknown; row?: NeisRow[] }> | undefined;

  if (!Array.isArray(blocks)) {
    return { rows: [], code: 'ERROR', message: 'NEIS 응답 형식이 올바르지 않습니다.' };
  }

  let code = 'INFO-000';
  let message = '정상 처리되었습니다.';

  for (const block of blocks) {
    if (Array.isArray(block.head)) {
      for (const head of block.head as Array<{
        RESULT?: { CODE: string; MESSAGE: string };
      }>) {
        if (head.RESULT) {
          code = head.RESULT.CODE;
          message = head.RESULT.MESSAGE;
        }
      }
    }

    if (Array.isArray(block.row)) {
      return { rows: block.row, code, message };
    }
  }

  return { rows: [], code, message };
}

async function fetchNeisPage(
  endpoint: string,
  params: Record<string, string | number>,
  pIndex: number,
  pSize = 100
): Promise<NeisParseResult> {
  const url = new URL(`${NEIS_BASE_URL}/${endpoint}`);
  url.searchParams.set('KEY', getNeisKey());
  url.searchParams.set('Type', 'json');
  url.searchParams.set('pIndex', String(pIndex));
  url.searchParams.set('pSize', String(pSize));

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error('NEIS API 요청에 실패했습니다.');
  }

  const data = (await response.json()) as Record<string, unknown>;

  if (data.RESULT) {
    const result = data.RESULT as { CODE: string; MESSAGE: string };
    return { rows: [], code: result.CODE, message: result.MESSAGE };
  }

  return parseNeisResponse(data, endpoint);
}

async function fetchNeis(
  endpoint: string,
  params: Record<string, string | number>
): Promise<NeisParseResult> {
  return fetchNeisPage(endpoint, params, 1);
}

async function fetchNeisAll(
  endpoint: string,
  params: Record<string, string | number>,
  pSize = 100
): Promise<NeisRow[]> {
  const allRows: NeisRow[] = [];

  for (let pIndex = 1; pIndex <= 20; pIndex++) {
    const { rows, code } = await fetchNeisPage(endpoint, params, pIndex, pSize);

    if (code === 'INFO-200' && pIndex === 1) {
      return [];
    }

    allRows.push(...rows);

    if (rows.length < pSize) {
      break;
    }
  }

  return allRows;
}

export const SUPPORTED_SCHOOL_LEVELS = ['elementary', 'middle', 'high'] as const;
export type SupportedSchoolLevel = (typeof SUPPORTED_SCHOOL_LEVELS)[number];

const SUPPORTED_SCHOOL_LEVEL_SET = new Set<string>(SUPPORTED_SCHOOL_LEVELS);

export function assertSupportedSchoolLevel(schoolLevel: string) {
  if (!SUPPORTED_SCHOOL_LEVEL_SET.has(schoolLevel)) {
    throw new Error('초등학교, 중학교, 고등학교만 지원합니다.');
  }
}

export function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 3 ? String(year) : String(year - 1);
}

const TIMETABLE_ENDPOINT: Record<SupportedSchoolLevel, string> = {
  elementary: 'elsTimetable',
  middle: 'misTimetable',
  high: 'hisTimetable',
};

export async function searchSchools(query: string, schoolLevel: string) {
  assertSupportedSchoolLevel(schoolLevel);

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const { rows, code } = await fetchNeis('schoolInfo', {
    SCHUL_NM: trimmed,
    SCHUL_KND_SC_NM: SCHOOL_KIND_LABEL[schoolLevel],
  });

  if (code === 'INFO-200') {
    return [];
  }

  return rows.map((row) => ({
    atptOfcdcScCode: row.ATPT_OFCDC_SC_CODE,
    atptOfcdcScNm: row.ATPT_OFCDC_SC_NM,
    sdSchulCode: row.SD_SCHUL_CODE,
    schulNm: row.SCHUL_NM,
    lctnScNm: row.LCTN_SC_NM,
  }));
}

function filterRowsByAcademicYear(rows: NeisRow[]): NeisRow[] {
  const currentAy = getCurrentAcademicYear();
  const currentYearRows = rows.filter((row) => row.AY === currentAy);

  if (currentYearRows.length > 0) {
    return currentYearRows;
  }

  const latestAy = rows
    .map((row) => row.AY)
    .filter(Boolean)
    .sort((a, b) => Number(b) - Number(a))[0];

  if (!latestAy) {
    return rows;
  }

  return rows.filter((row) => row.AY === latestAy);
}

export async function getClassInfo(
  schoolLevel: string,
  atptOfcdcScCode: string,
  sdSchulCode: string,
  grade?: string
) {
  assertSupportedSchoolLevel(schoolLevel);

  const params: Record<string, string> = {
    ATPT_OFCDC_SC_CODE: atptOfcdcScCode,
    SD_SCHUL_CODE: sdSchulCode,
  };

  if (grade) {
    params.GRADE = grade;
  }

  const { rows, code } = await fetchNeis('classInfo', params);

  if (code === 'INFO-200') {
    return { grades: [] as string[], classes: [] as string[] };
  }

  const filteredRows = filterRowsByAcademicYear(rows);

  const grades = [...new Set(filteredRows.map((row) => row.GRADE).filter(Boolean))].sort(
    (a, b) => Number(a) - Number(b)
  );

  const classes = [
    ...new Set(
      filteredRows
        .filter((row) => !grade || row.GRADE === grade)
        .map((row) => row.CLASS_NM)
        .filter(Boolean)
    ),
  ].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));

  return { grades, classes };
}

export interface TimetableEntry {
  date: string;
  period: number;
  subject: string;
}

export interface SchoolExamEvent {
  date: string;
  title: string;
  description?: string;
  category: string;
}

export type SchoolScheduleEventKind = 'exam' | 'holiday';

export interface SchoolScheduleEvent extends SchoolExamEvent {
  kind: SchoolScheduleEventKind;
}

export interface SchoolTimetableBundle {
  entries: TimetableEntry[];
  scheduleEvents: SchoolScheduleEvent[];
}

export function parseIsoDateToYmd(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

export function getAcademicYearAndSemester(ymd: string): { ay: string; sem: string } {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6));

  const ay = month >= 3 ? String(year) : String(year - 1);
  const sem = month >= 3 && month <= 8 ? '1' : '2';

  return { ay, sem };
}

const OFF_DAY_LABELS = new Set(['휴업일', '공휴일']);

const GRADE_EVENT_FIELD: Record<string, string> = {
  '1': 'ONE_GRADE_EVENT_YN',
  '2': 'TW_GRADE_EVENT_YN',
  '3': 'THREE_GRADE_EVENT_YN',
  '4': 'FR_GRADE_EVENT_YN',
  '5': 'FIV_GRADE_EVENT_YN',
  '6': 'SIX_GRADE_EVENT_YN',
};

const HOLIDAY_SUBJECT_PATTERN =
  /휴업|공휴|선거|방학|개교기념일|임시휴업|재량|원격수업|코로나|설날|추석|현충일|광복절|개천절|한글날|어린이날|성탄절|크리스마스/i;

const EXAM_EVENT_PATTERN =
  /지필평가|중간고사|기말고사|형성평가|수행평가|학력평가|모의고사|원점수|성취도|단원평가|마무리평가|회고사|고사|차시험/i;

const EXAM_EVENT_EXCLUDE_PATTERN =
  /시험\s*안내|시험\s*준비|시험\s*대비|시험\s*일정\s*안내/i;

const HOLIDAY_SCHEDULE_PATTERN =
  /방학|추석|설날|개천절|한글날|어린이날|현충일|광복절|성탄|크리스마스|3·1절|대체공휴|재량휴업|임시공휴|공휴|휴업|수능|선거|종업식|입학식|개교기념일/i;

const HIDDEN_SCHEDULE_EVENT_PATTERN = /토요\s*휴업일/;

function appliesToGrade(row: NeisRow, grade: string): boolean {
  const field = GRADE_EVENT_FIELD[grade];
  if (!field) {
    return true;
  }

  const flag = row[field];
  return flag === 'Y' || flag === '*';
}

export function isExamEvent(eventNm: string): boolean {
  const trimmed = eventNm.trim();
  if (!trimmed || EXAM_EVENT_EXCLUDE_PATTERN.test(trimmed)) {
    return false;
  }

  return EXAM_EVENT_PATTERN.test(trimmed);
}

export function isHiddenScheduleEvent(title: string): boolean {
  return HIDDEN_SCHEDULE_EVENT_PATTERN.test(title.trim());
}

function appliesToGradeForExam(row: NeisRow, grade: string): boolean {
  const field = GRADE_EVENT_FIELD[grade];
  if (!field) {
    return false;
  }

  return row[field] === 'Y';
}

export function isHolidayScheduleEvent(row: NeisRow): boolean {
  const title = row.EVENT_NM?.trim() ?? '';
  if (!title || isExamEvent(title)) {
    return false;
  }

  if (OFF_DAY_LABELS.has(row.SBTR_DD_SC_NM)) {
    return true;
  }

  return HOLIDAY_SCHEDULE_PATTERN.test(title);
}

export function isHolidaySubject(subject: string): boolean {
  return HOLIDAY_SUBJECT_PATTERN.test(subject);
}

type SchoolScheduleParams = {
  atptOfcdcScCode: string;
  sdSchulCode: string;
  fromDate: string;
  toDate: string;
};

async function fetchSchoolScheduleRows(params: SchoolScheduleParams): Promise<NeisRow[]> {
  return fetchNeisAll('SchoolSchedule', {
    ATPT_OFCDC_SC_CODE: params.atptOfcdcScCode,
    SD_SCHUL_CODE: params.sdSchulCode,
    AA_FROM_YMD: params.fromDate,
    AA_TO_YMD: params.toDate,
  });
}

function extractOffDatesFromScheduleRows(rows: NeisRow[], grade: string): Set<string> {
  const offDates = new Set<string>();

  for (const row of rows) {
    if (!row.AA_YMD || !OFF_DAY_LABELS.has(row.SBTR_DD_SC_NM)) {
      continue;
    }

    if (!appliesToGrade(row, grade)) {
      continue;
    }

    offDates.add(row.AA_YMD);
  }

  return offDates;
}

export function extractExamEventsFromScheduleRows(
  rows: NeisRow[],
  grade: string
): SchoolExamEvent[] {
  return extractSchoolScheduleEventsFromRows(rows, grade)
    .filter((event) => event.kind === 'exam')
    .map(({ kind: _kind, ...event }) => event);
}

export function extractSchoolScheduleEventsFromRows(
  rows: NeisRow[],
  grade: string
): SchoolScheduleEvent[] {
  const events: SchoolScheduleEvent[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!row.AA_YMD || !row.EVENT_NM) {
      continue;
    }

    const title = row.EVENT_NM.trim();
    if (isHiddenScheduleEvent(title)) {
      continue;
    }

    const isExam = isExamEvent(title);
    const isHoliday = isHolidayScheduleEvent(row);

    if (!isExam && !isHoliday) {
      continue;
    }

    const applies = isExam
      ? appliesToGradeForExam(row, grade)
      : appliesToGrade(row, grade);

    if (!applies) {
      continue;
    }

    const kind: SchoolScheduleEventKind = isExam ? 'exam' : 'holiday';
    const key = `${kind}:${row.AA_YMD}:${title}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    const description = row.EVENT_CNTNT?.trim();
    events.push({
      date: row.AA_YMD,
      title,
      description: description || undefined,
      category: row.SBTR_DD_SC_NM?.trim() || '',
      kind,
    });
  }

  return events.sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
  );
}

export async function getSchoolOffDates(params: {
  atptOfcdcScCode: string;
  sdSchulCode: string;
  grade: string;
  fromDate: string;
  toDate: string;
}): Promise<Set<string>> {
  const rows = await fetchSchoolScheduleRows(params);
  return extractOffDatesFromScheduleRows(rows, params.grade);
}

export function dedupeTimetableEntries(entries: TimetableEntry[]): TimetableEntry[] {
  const seen = new Set<string>();
  const result: TimetableEntry[] = [];

  for (const entry of entries) {
    const key = `${entry.date}-${entry.period}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(entry);
  }

  return result;
}

export function filterTimetableEntries(
  entries: TimetableEntry[],
  offDates: Set<string>
): TimetableEntry[] {
  return entries.filter((entry) => {
    if (offDates.has(entry.date)) {
      return false;
    }

    if (isHolidaySubject(entry.subject)) {
      return false;
    }

    return true;
  });
}

type SchoolTimetableParams = {
  schoolLevel: SupportedSchoolLevel;
  atptOfcdcScCode: string;
  sdSchulCode: string;
  grade: string;
  className: string;
  fromDate: string;
  toDate: string;
};

function logTimetableCacheEvent(
  event: 'hit' | 'miss' | 'fetch',
  params: Pick<
    SchoolTimetableParams,
    'sdSchulCode' | 'grade' | 'className' | 'fromDate' | 'toDate'
  >,
  durationMs?: number
) {
  const context =
    `neis timetable cache ${event} ` +
    `sdSchulCode=${params.sdSchulCode} grade=${params.grade} className=${params.className} ` +
    `fromDate=${params.fromDate} toDate=${params.toDate}`;

  if (durationMs !== undefined) {
    console.info(`${context} durationMs=${durationMs}`);
    return;
  }

  console.info(context);
}

async function fetchSchoolTimetableFromNeis(
  params: SchoolTimetableParams
): Promise<SchoolTimetableBundle> {
  const endpoint = TIMETABLE_ENDPOINT[params.schoolLevel];
  if (!endpoint) {
    throw new Error('지원하지 않는 학교 구분입니다.');
  }

  const { ay, sem } = getAcademicYearAndSemester(params.fromDate);

  const scheduleParams = {
    atptOfcdcScCode: params.atptOfcdcScCode,
    sdSchulCode: params.sdSchulCode,
    fromDate: params.fromDate,
    toDate: params.toDate,
  };

  const [timetableResult, scheduleRows] = await Promise.all([
    fetchNeis(endpoint, {
      ATPT_OFCDC_SC_CODE: params.atptOfcdcScCode,
      SD_SCHUL_CODE: params.sdSchulCode,
      GRADE: params.grade,
      CLASS_NM: params.className,
      TI_FROM_YMD: params.fromDate,
      TI_TO_YMD: params.toDate,
      AY: ay,
      SEM: sem,
    }),
    fetchSchoolScheduleRows(scheduleParams).catch(() => [] as NeisRow[]),
  ]);

  const offDates = extractOffDatesFromScheduleRows(scheduleRows, params.grade);
  const scheduleEvents = extractSchoolScheduleEventsFromRows(scheduleRows, params.grade);

  const { rows, code } = timetableResult;

  if (code === 'INFO-200') {
    return { entries: [], scheduleEvents };
  }

  const entries = rows
    .filter((row) => row.ALL_TI_YMD && row.PERIO && row.ITRT_CNTNT)
    .map((row) => ({
      date: row.ALL_TI_YMD,
      period: Number(row.PERIO),
      subject: row.ITRT_CNTNT.trim(),
    }))
    .filter((entry) => entry.period > 0 && entry.subject.length > 0);

  return {
    entries: filterTimetableEntries(dedupeTimetableEntries(entries), offDates),
    scheduleEvents,
  };
}

export async function getSchoolTimetableBundle(
  params: SchoolTimetableParams
): Promise<SchoolTimetableBundle> {
  if (!isNeisCacheEnabled()) {
    return fetchSchoolTimetableFromNeis(params);
  }

  const { ay, sem } = getAcademicYearAndSemester(params.fromDate);
  const cacheKey = buildTimetableCacheKey({ ...params, ay, sem });
  const cached = getCachedTimetableBundle(cacheKey);

  if (cached !== null) {
    recordTimetableCacheHit();
    logTimetableCacheEvent('hit', params);
    return cached;
  }

  recordTimetableCacheMiss();
  logTimetableCacheEvent('miss', params);

  const startedAt = Date.now();
  const bundle = await fetchSchoolTimetableFromNeis(params);
  logTimetableCacheEvent('fetch', params, Date.now() - startedAt);

  setCachedTimetableBundle(cacheKey, bundle, getTimetableCacheTtlMs());
  return bundle;
}

export async function getSchoolTimetable(
  params: SchoolTimetableParams
): Promise<TimetableEntry[]> {
  const bundle = await getSchoolTimetableBundle(params);
  return bundle.entries;
}

/** @deprecated getSchoolTimetable 사용 */
export async function getMiddleSchoolTimetable(
  params: Omit<Parameters<typeof getSchoolTimetable>[0], 'schoolLevel'>
): Promise<TimetableEntry[]> {
  return getSchoolTimetable({ ...params, schoolLevel: 'middle' });
}

export function isoDateRangeToYmd(start: string, end: string) {
  return {
    fromDate: parseIsoDateToYmd(start),
    toDate: parseIsoDateToYmd(end),
  };
}
