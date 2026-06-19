import { createCustomSubjectId } from './user-subject-seed';
import {
  buildFallbackUserSubjects,
  isLegacyStudyPlanSubject,
  LEGACY_STUDY_PLAN_SUBJECTS,
  MAX_SUBJECT_TAG_LENGTH,
  MAX_SUBJECT_TAGS,
  type LegacyStudyPlanSubject,
  type PlanSubjectKey,
  type UserSubject,
  type UserSubjectSource,
} from './user-subject';

const SUBJECT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function normalizeSubjectTag(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function parseSubjectTagList(raw: unknown): string[] | null {
  if (raw === undefined || raw === null) {
    return [];
  }

  if (!Array.isArray(raw)) {
    return null;
  }

  const tags: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (typeof item !== 'string') {
      return null;
    }

    const normalized = normalizeSubjectTag(item);
    if (!normalized) {
      continue;
    }

    if (normalized.length > MAX_SUBJECT_TAG_LENGTH) {
      return null;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    tags.push(normalized);

    if (tags.length > MAX_SUBJECT_TAGS) {
      return null;
    }
  }

  return tags;
}

function validateSubjectTagList(
  raw: unknown,
  fieldLabel: string
): { tags: string[] } | { error: string } {
  if (raw === undefined || raw === null) {
    return { tags: [] };
  }

  if (!Array.isArray(raw)) {
    return { error: `${fieldLabel}은(는) 문자열 배열이어야 합니다.` };
  }

  const tags: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (typeof item !== 'string') {
      return { error: `${fieldLabel} 항목은 문자열이어야 합니다.` };
    }

    const normalized = normalizeSubjectTag(item);
    if (!normalized) {
      continue;
    }

    if (normalized.length > MAX_SUBJECT_TAG_LENGTH) {
      return {
        error: `${fieldLabel} 항목은 ${MAX_SUBJECT_TAG_LENGTH}자 이하여야 합니다.`,
      };
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    tags.push(normalized);

    if (tags.length > MAX_SUBJECT_TAGS) {
      return {
        error: `${fieldLabel}은(는) 최대 ${MAX_SUBJECT_TAGS}개까지 등록할 수 있습니다.`,
      };
    }
  }

  return { tags };
}

function appendSubjectTags(
  subject: UserSubject,
  textbooks: string[],
  studyMethods: string[]
): UserSubject {
  if (textbooks.length > 0) {
    subject.textbooks = textbooks;
  }

  if (studyMethods.length > 0) {
    subject.studyMethods = studyMethods;
  }

  return subject;
}

export function parseUserSubjects(raw: unknown): UserSubject[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const subjects: UserSubject[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    const source = record.source;

    if (!id || !label || (source !== 'neis' && source !== 'custom')) {
      return null;
    }

    let category: LegacyStudyPlanSubject | undefined;
    if (record.category !== undefined && record.category !== null && record.category !== '') {
      if (!isLegacyStudyPlanSubject(String(record.category))) {
        return null;
      }
      category = record.category as LegacyStudyPlanSubject;
    }

    const textbooks = parseSubjectTagList(record.textbooks);
    if (textbooks === null) {
      return null;
    }

    const studyMethods = parseSubjectTagList(record.studyMethods);
    if (studyMethods === null) {
      return null;
    }

    subjects.push(
      appendSubjectTags(
        {
          id,
          label,
          category,
          source: source as UserSubjectSource,
        },
        textbooks,
        studyMethods
      )
    );
  }

  return subjects;
}

export function resolveProfileSubjects(raw: unknown): UserSubject[] {
  const parsed = parseUserSubjects(raw);
  if (parsed && parsed.length > 0) {
    return parsed;
  }
  return buildFallbackUserSubjects();
}

export function buildAllowedPlanSubjectIds(
  subjects?: UserSubject[] | null
): Set<PlanSubjectKey> {
  const ids = new Set<PlanSubjectKey>(LEGACY_STUDY_PLAN_SUBJECTS);

  if (subjects) {
    for (const subject of subjects) {
      if (subject.id) {
        ids.add(subject.id);
      }
    }
  }

  return ids;
}

export function isAllowedPlanSubject(
  subject: string,
  allowedIds: Set<PlanSubjectKey>
): boolean {
  return allowedIds.has(subject);
}

export function validateAndNormalizeUserSubjects(
  raw: unknown
): { subjects: UserSubject[] } | { error: string } {
  if (!Array.isArray(raw)) {
    return { error: 'subjects는 배열이어야 합니다.' };
  }

  if (raw.length === 0) {
    return { error: '과목을 1개 이상 유지해야 합니다.' };
  }

  const subjects: UserSubject[] = [];
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();

  for (let index = 0; index < raw.length; index++) {
    const item = raw[index];

    if (!item || typeof item !== 'object') {
      return { error: `subjects[${index}] 형식이 올바르지 않습니다.` };
    }

    const record = item as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.trim() : '';

    if (!label) {
      return { error: `subjects[${index}].label은 필수입니다.` };
    }

    const normalizedLabel = label.replace(/\s+/g, ' ');
    const labelKey = normalizedLabel.toLowerCase();

    if (seenLabels.has(labelKey)) {
      return { error: '중복된 과목명이 있습니다.' };
    }

    seenLabels.add(labelKey);

    let id = typeof record.id === 'string' ? record.id.trim() : '';

    if (!id) {
      id = createCustomSubjectId(normalizedLabel);
    }

    if (!SUBJECT_ID_PATTERN.test(id)) {
      return { error: `subjects[${index}].id 형식이 올바르지 않습니다.` };
    }

    if (seenIds.has(id)) {
      return { error: '중복된 과목 id가 있습니다.' };
    }

    seenIds.add(id);

    const source: UserSubjectSource =
      record.source === 'neis' || record.source === 'custom' ? record.source : 'custom';

    let category: LegacyStudyPlanSubject | undefined;

    if (record.category !== undefined && record.category !== null && record.category !== '') {
      if (!isLegacyStudyPlanSubject(String(record.category))) {
        return { error: `subjects[${index}].category가 유효하지 않습니다.` };
      }

      category = record.category as LegacyStudyPlanSubject;
    } else if (isLegacyStudyPlanSubject(id)) {
      category = id;
    }

    const textbooksResult = validateSubjectTagList(
      record.textbooks,
      `subjects[${index}].textbooks`
    );
    if ('error' in textbooksResult) {
      return { error: textbooksResult.error };
    }

    const studyMethodsResult = validateSubjectTagList(
      record.studyMethods,
      `subjects[${index}].studyMethods`
    );
    if ('error' in studyMethodsResult) {
      return { error: studyMethodsResult.error };
    }

    subjects.push(
      appendSubjectTags(
        {
          id,
          label: normalizedLabel,
          category,
          source,
        },
        textbooksResult.tags,
        studyMethodsResult.tags
      )
    );
  }

  return { subjects };
}
