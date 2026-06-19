import {
  getSchoolTimetable,
  isoDateRangeToYmd,
  type SupportedSchoolLevel,
  type TimetableEntry,
} from './neis';
import { resolveSchoolSubject } from './resolve-school-subject';
import {
  buildFallbackUserSubjects,
  type UserSubject,
} from './user-subject';

/** NEIS 시간표에서 과목 목록 추출 시 조회 기간 (일) */
export const SUBJECT_SEED_LOOKAHEAD_DAYS = 56;

const HOLIDAY_SUBJECT_PATTERN =
  /휴업|공휴|선거|방학|개교기념일|임시휴업|재량|원격수업|코로나|설날|추석|현충일|광복절|개천절|한글날|어린이날|성탄절|크리스마스/i;

const EXTRACURRICULAR_SUBJECT_PATTERN =
  /창의|창체|체험활동|동아리|자율|진로|봉사|스포츠|클럽|독서\s*토론|학급\s*회의|종례|조회|하교|등교|급식|쉬는\s*시간|자습\s*감독|방과\s*후/i;

export interface StudentSchoolProfileForSeed {
  schoolLevel: SupportedSchoolLevel;
  atptOfcdcScCode: string;
  sdSchulCode: string;
  grade: string;
  className: string;
}

export interface SchoolProfileIdentity {
  atptOfcdcScCode?: string | null;
  sdSchulCode?: string | null;
  grade?: string | null;
  className?: string | null;
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6)) - 1;
  const day = Number(ymd.slice(6, 8));
  const date = new Date(year, month, day);
  date.setDate(date.getDate() + days);
  return formatYmd(date);
}

export function createNeisSubjectId(label: string): string {
  const normalized = label.replace(/\s+/g, '').trim();
  let hash = 2166136261;

  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `neis-${(hash >>> 0).toString(36)}`;
}

export function createCustomSubjectId(label: string): string {
  return `custom-${createNeisSubjectId(label).slice(5)}`;
}

export function isExtracurricularSubject(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) {
    return true;
  }

  return (
    HOLIDAY_SUBJECT_PATTERN.test(trimmed) ||
    EXTRACURRICULAR_SUBJECT_PATTERN.test(trimmed)
  );
}

export function extractUniqueTimetableSubjectLabels(entries: TimetableEntry[]): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const entry of entries) {
    const label = entry.subject.trim();
    if (!label || isExtracurricularSubject(label)) {
      continue;
    }

    const key = label.replace(/\s+/g, ' ');
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    labels.push(label);
  }

  return labels;
}

export function buildSubjectsFromTimetableLabels(labels: string[]): UserSubject[] {
  const subjects: UserSubject[] = [];
  const usedIds = new Set<string>();

  for (const label of labels) {
    const id = createNeisSubjectId(label);
    if (usedIds.has(id)) {
      continue;
    }

    usedIds.add(id);
    subjects.push({
      id,
      label,
      category: resolveSchoolSubject(label),
      source: 'neis',
    });
  }

  return subjects;
}

export function buildSubjectsFromTimetableEntries(entries: TimetableEntry[]): UserSubject[] {
  return buildSubjectsFromTimetableLabels(extractUniqueTimetableSubjectLabels(entries));
}

export function hasSchoolProfileIdentityChanged(
  before: SchoolProfileIdentity,
  after: SchoolProfileIdentity
): boolean {
  return (
    before.atptOfcdcScCode !== after.atptOfcdcScCode ||
    before.sdSchulCode !== after.sdSchulCode ||
    before.grade !== after.grade ||
    before.className !== after.className
  );
}

export async function fetchSubjectsFromNeis(
  profile: StudentSchoolProfileForSeed
): Promise<UserSubject[]> {
  const start = formatYmd(new Date());
  const end = addDaysYmd(start, SUBJECT_SEED_LOOKAHEAD_DAYS);
  const { fromDate, toDate } = isoDateRangeToYmd(
    `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}`,
    `${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}`
  );

  const entries = await getSchoolTimetable({
    schoolLevel: profile.schoolLevel,
    atptOfcdcScCode: profile.atptOfcdcScCode,
    sdSchulCode: profile.sdSchulCode,
    grade: profile.grade,
    className: profile.className,
    fromDate,
    toDate,
  });

  return buildSubjectsFromTimetableEntries(entries);
}

export async function resolveSeedSubjectsForProfile(
  profile: StudentSchoolProfileForSeed
): Promise<UserSubject[]> {
  try {
    const subjects = await fetchSubjectsFromNeis(profile);
    if (subjects.length === 0) {
      return buildFallbackUserSubjects();
    }
    return subjects;
  } catch (error) {
    console.warn(
      'NEIS 과목 seed 실패, fallback 사용:',
      error instanceof Error ? error.message : error
    );
    return buildFallbackUserSubjects();
  }
}

export function resolveFallbackSubjectsForOtherStudent(): UserSubject[] {
  return buildFallbackUserSubjects();
}
