import { randomUUID } from 'node:crypto';

import {
  listPrepWeekNumbers,
  MAX_EXAM_PREP_WEEKS,
  MIN_EXAM_PREP_WEEKS,
  type ExamRoundSlot,
} from './exam-countdown';
import {
  getExamPrepWeeklyPlanContent,
  MAX_EXAM_PREP_WEEKLY_PLAN_CONTENT_LENGTH,
  type ExamPrepWeeklyPlans,
} from './exam-prep-weekly-plan';
import {
  isLegacyStudyPlanSubject,
  LEGACY_SUBJECT_LABELS,
  type UserSubject,
} from './user-subject';

export const MAX_EXAM_PREP_WEEKLY_PLAN_TEMPLATE_NAME_LENGTH = 50;
export const MAX_EXAM_PREP_WEEKLY_PLAN_TEMPLATES = 20;
export const EXAM_PREP_TEMPLATE_SUBJECT_LABEL_PREFIX = 'label:';

export type ExamPrepWeeklyPlanTemplateWeekSubjects = Record<string, string>;

export interface ExamPrepWeeklyPlanTemplate {
  id: string;
  name: string;
  weekCount: number;
  createdAt: string;
  weeks: Partial<Record<string, ExamPrepWeeklyPlanTemplateWeekSubjects>>;
}

export type ExamPrepWeeklyPlanTemplateCreateInput = Pick<
  ExamPrepWeeklyPlanTemplate,
  'name' | 'weekCount' | 'weeks'
>;

export function createEmptyExamPrepWeeklyPlanTemplates(): ExamPrepWeeklyPlanTemplate[] {
  return [];
}

function normalizeWeekContent(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return '';
  }

  if (normalized.length > MAX_EXAM_PREP_WEEKLY_PLAN_CONTENT_LENGTH) {
    return null;
  }

  return normalized;
}

export function normalizeTemplateSubjectLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ');
}

export function buildTemplateSubjectKey(subject: UserSubject): string {
  if (subject.category && isLegacyStudyPlanSubject(subject.category)) {
    return subject.category;
  }

  return `${EXAM_PREP_TEMPLATE_SUBJECT_LABEL_PREFIX}${normalizeTemplateSubjectLabel(subject.label)}`;
}

export function isValidTemplateSubjectKey(key: string): boolean {
  if (!key.trim()) {
    return false;
  }

  if (isLegacyStudyPlanSubject(key)) {
    return true;
  }

  if (!key.startsWith(EXAM_PREP_TEMPLATE_SUBJECT_LABEL_PREFIX)) {
    return false;
  }

  return normalizeTemplateSubjectLabel(
    key.slice(EXAM_PREP_TEMPLATE_SUBJECT_LABEL_PREFIX.length)
  ).length > 0;
}

function normalizeTemplateWeekSubjects(
  value: unknown
): ExamPrepWeeklyPlanTemplateWeekSubjects | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const subjects: ExamPrepWeeklyPlanTemplateWeekSubjects = {};

  for (const [subjectKey, content] of Object.entries(value as Record<string, unknown>)) {
    if (!isValidTemplateSubjectKey(subjectKey)) {
      return null;
    }

    const normalizedContent = normalizeWeekContent(content);
    if (normalizedContent === null) {
      return null;
    }

    if (normalizedContent) {
      subjects[subjectKey] = normalizedContent;
    }
  }

  return subjects;
}

function normalizeTemplateWeeks(
  value: unknown
): Partial<Record<string, ExamPrepWeeklyPlanTemplateWeekSubjects>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const weeks: Partial<Record<string, ExamPrepWeeklyPlanTemplateWeekSubjects>> = {};

  for (const [weekKey, weekValue] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d+$/.test(weekKey)) {
      continue;
    }

    const weekNumber = Number(weekKey);
    if (
      !Number.isInteger(weekNumber) ||
      weekNumber < MIN_EXAM_PREP_WEEKS ||
      weekNumber > MAX_EXAM_PREP_WEEKS
    ) {
      continue;
    }

    const subjects = normalizeTemplateWeekSubjects(weekValue);
    if (subjects === null) {
      return null;
    }

    if (Object.keys(subjects).length > 0) {
      weeks[String(weekNumber)] = subjects;
    }
  }

  return weeks;
}

function normalizeTemplateName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return '';
  }

  if (normalized.length > MAX_EXAM_PREP_WEEKLY_PLAN_TEMPLATE_NAME_LENGTH) {
    return null;
  }

  return normalized;
}

function normalizeTemplateId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function normalizeCreatedAt(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
}

function normalizeWeekCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return null;
  }

  if (value < MIN_EXAM_PREP_WEEKS || value > MAX_EXAM_PREP_WEEKS) {
    return null;
  }

  return value;
}

function normalizeTemplateRecord(value: unknown): ExamPrepWeeklyPlanTemplate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = normalizeTemplateId(record.id);
  const name = normalizeTemplateName(record.name);
  const weekCount = normalizeWeekCount(record.weekCount);
  const createdAt = normalizeCreatedAt(record.createdAt);
  const weeks = normalizeTemplateWeeks(record.weeks);

  if (!id || !name || weekCount === null || !createdAt || weeks === null) {
    return null;
  }

  if (Object.keys(weeks).length === 0) {
    return null;
  }

  return {
    id,
    name,
    weekCount,
    createdAt,
    weeks,
  };
}

export function resolveExamPrepWeeklyPlanTemplates(
  value: unknown
): ExamPrepWeeklyPlanTemplate[] {
  if (!Array.isArray(value)) {
    return createEmptyExamPrepWeeklyPlanTemplates();
  }

  const templates: ExamPrepWeeklyPlanTemplate[] = [];
  const seenIds = new Set<string>();

  for (const item of value) {
    const template = normalizeTemplateRecord(item);
    if (!template || seenIds.has(template.id)) {
      continue;
    }

    seenIds.add(template.id);
    templates.push(template);

    if (templates.length >= MAX_EXAM_PREP_WEEKLY_PLAN_TEMPLATES) {
      break;
    }
  }

  return templates.sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  );
}

export function countTemplateWeeksWithContent(
  weeks: Partial<Record<string, ExamPrepWeeklyPlanTemplateWeekSubjects>>
): number {
  return Object.values(weeks).filter((weekSubjects) =>
    Object.values(weekSubjects ?? {}).some((content) => content.trim().length > 0)
  ).length;
}

export function countTemplateSubjectKeys(
  weeks: Partial<Record<string, ExamPrepWeeklyPlanTemplateWeekSubjects>>
): number {
  const subjectKeys = new Set<string>();

  for (const weekSubjects of Object.values(weeks)) {
    for (const subjectKey of Object.keys(weekSubjects ?? {})) {
      subjectKeys.add(subjectKey);
    }
  }

  return subjectKeys.size;
}

export function validateCreateExamPrepWeeklyPlanTemplateInput(
  value: unknown
): { template: ExamPrepWeeklyPlanTemplateCreateInput } | { error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '템플릿 형식이 올바르지 않습니다.' };
  }

  const record = value as Record<string, unknown>;
  const name = normalizeTemplateName(record.name);
  const weekCount = normalizeWeekCount(record.weekCount);
  const weeks = normalizeTemplateWeeks(record.weeks);

  if (name === null) {
    return {
      error: `템플릿 제목은 ${MAX_EXAM_PREP_WEEKLY_PLAN_TEMPLATE_NAME_LENGTH}자 이하여야 합니다.`,
    };
  }

  if (!name) {
    return { error: '템플릿 제목을 입력해 주세요.' };
  }

  if (weekCount === null) {
    return {
      error: `준비 주차는 ${MIN_EXAM_PREP_WEEKS}~${MAX_EXAM_PREP_WEEKS} 사이여야 합니다.`,
    };
  }

  if (weeks === null) {
    return { error: '템플릿 주차별 내용 형식이 올바르지 않습니다.' };
  }

  if (Object.keys(weeks).length === 0) {
    return { error: '저장할 공부계획 내용이 없습니다.' };
  }

  for (const weekKey of Object.keys(weeks)) {
    const weekNumber = Number(weekKey);
    if (weekNumber > weekCount) {
      return {
        error: `템플릿 주차는 준비 기간(${weekCount}주)을 초과할 수 없습니다.`,
      };
    }
  }

  return {
    template: {
      name,
      weekCount,
      weeks,
    },
  };
}

export type ExamPrepTemplateApplyMode = 'overwrite' | 'fill-empty';

export interface ApplyExamPrepTemplateResult {
  plans: ExamPrepWeeklyPlans;
  skippedSubjectKeys: string[];
  appliedWeekCount: number;
}

function writeRoundWeekContent(
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot,
  weekNumber: number,
  subjectId: string,
  content: string
): ExamPrepWeeklyPlans {
  const weekKey = String(weekNumber);
  const roundPlan = plans[roundSlot] ?? { weeks: {} };
  const weekSubjects = { ...(roundPlan.weeks[weekKey] ?? {}) };

  if (content.trim()) {
    weekSubjects[subjectId] = content;
  } else {
    delete weekSubjects[subjectId];
  }

  const nextWeeks = { ...roundPlan.weeks };
  if (Object.keys(weekSubjects).length > 0) {
    nextWeeks[weekKey] = weekSubjects;
  } else {
    delete nextWeeks[weekKey];
  }

  const nextPlans = { ...plans };
  if (Object.keys(nextWeeks).length > 0) {
    nextPlans[roundSlot] = { weeks: nextWeeks };
  } else {
    delete nextPlans[roundSlot];
  }

  return nextPlans;
}

export function hasExamPrepRoundContent(
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot
): boolean {
  const roundPlan = plans[roundSlot];
  if (!roundPlan?.weeks) {
    return false;
  }

  for (const weekSubjects of Object.values(roundPlan.weeks)) {
    for (const content of Object.values(weekSubjects ?? {})) {
      if (content.trim()) {
        return true;
      }
    }
  }

  return false;
}

export function buildTemplateSubjectKeyIndex(
  subjects: UserSubject[]
): Map<string, string> {
  const index = new Map<string, string>();

  for (const subject of subjects) {
    const key = buildTemplateSubjectKey(subject);
    if (!index.has(key)) {
      index.set(key, subject.id);
    }
  }

  return index;
}

function isLegacyAbsolutePrepWeekTemplate(
  template: Pick<ExamPrepWeeklyPlanTemplate, 'weeks' | 'weekCount'>
): boolean {
  const keys = Object.keys(template.weeks)
    .map(Number)
    .filter((weekKey) => Number.isInteger(weekKey) && weekKey >= 1);

  if (keys.length === 0) {
    return false;
  }

  const prepWeeks = listPrepWeekNumbers(template.weekCount);
  const sortedKeysDesc = [...keys].sort((left, right) => right - left);
  const topPrepWeeks = prepWeeks.slice(0, keys.length);

  if (
    sortedKeysDesc.length !== topPrepWeeks.length ||
    !sortedKeysDesc.every((weekKey, index) => weekKey === topPrepWeeks[index])
  ) {
    return false;
  }

  // Ordinal templates use 1, 2, ... (sorted [2,1] != [6,5]).
  return !keys.includes(1);
}

function migrateLegacyAbsoluteTemplateWeeks(
  template: Pick<ExamPrepWeeklyPlanTemplate, 'weeks' | 'weekCount'>
): Partial<Record<string, ExamPrepWeeklyPlanTemplateWeekSubjects>> {
  const prepWeeks = listPrepWeekNumbers(template.weekCount);
  const migrated: Partial<Record<string, ExamPrepWeeklyPlanTemplateWeekSubjects>> = {};

  for (const [weekKey, weekSubjects] of Object.entries(template.weeks)) {
    const absoluteWeek = Number(weekKey);
    if (!Number.isInteger(absoluteWeek) || !weekSubjects) {
      continue;
    }

    const ordinal = prepWeeks.indexOf(absoluteWeek) + 1;
    if (ordinal > 0) {
      migrated[String(ordinal)] = weekSubjects;
    }
  }

  return migrated;
}

function resolveTemplateWeeksForApply(
  template: Pick<ExamPrepWeeklyPlanTemplate, 'weeks' | 'weekCount'>
): Partial<Record<string, ExamPrepWeeklyPlanTemplateWeekSubjects>> {
  if (isLegacyAbsolutePrepWeekTemplate(template)) {
    return migrateLegacyAbsoluteTemplateWeeks(template);
  }

  return template.weeks;
}

function getTemplateWeekByOrdinal(
  weeks: Partial<Record<string, ExamPrepWeeklyPlanTemplateWeekSubjects>>,
  ordinal: number
): ExamPrepWeeklyPlanTemplateWeekSubjects | undefined {
  return weeks[String(ordinal)];
}

function getRoundWeekContentForExtract(
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot,
  weekCount: number,
  ordinal: number,
  subjectId: string
): string {
  const prepWeeks = listPrepWeekNumbers(weekCount);
  const absoluteWeek = prepWeeks[ordinal - 1];

  if (absoluteWeek === undefined) {
    return '';
  }

  return (
    getExamPrepWeeklyPlanContent(plans, roundSlot, absoluteWeek, subjectId) ?? ''
  );
}

export function extractRoundToTemplateWeeks(
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot,
  subjects: UserSubject[],
  weekCount: number
): Partial<Record<string, ExamPrepWeeklyPlanTemplateWeekSubjects>> {
  const weeks: Partial<Record<string, ExamPrepWeeklyPlanTemplateWeekSubjects>> = {};

  for (let ordinal = 1; ordinal <= weekCount; ordinal++) {
    const weekSubjects: ExamPrepWeeklyPlanTemplateWeekSubjects = {};

    for (const subject of subjects) {
      const content = getRoundWeekContentForExtract(
        plans,
        roundSlot,
        weekCount,
        ordinal,
        subject.id
      );

      if (content) {
        weekSubjects[buildTemplateSubjectKey(subject)] = content;
      }
    }

    if (Object.keys(weekSubjects).length > 0) {
      weeks[String(ordinal)] = weekSubjects;
    }
  }

  return weeks;
}

export function extractRoundToTemplateCreateInput(
  name: string,
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot,
  subjects: UserSubject[],
  weekCount: number
): ExamPrepWeeklyPlanTemplateCreateInput | null {
  const weeks = extractRoundToTemplateWeeks(plans, roundSlot, subjects, weekCount);

  if (Object.keys(weeks).length === 0) {
    return null;
  }

  return {
    name,
    weekCount,
    weeks,
  };
}

export function resolveUniqueTemplateName(
  name: string,
  templates: ExamPrepWeeklyPlanTemplate[]
): string {
  const existingNames = new Set(templates.map((template) => template.name));

  if (!existingNames.has(name)) {
    return name;
  }

  let suffix = 2;
  while (existingNames.has(`${name} (${suffix})`)) {
    suffix += 1;
  }

  return `${name} (${suffix})`;
}

export function getUnmatchedTemplateSubjectLabels(
  skippedSubjectKeys: string[]
): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const subjectKey of skippedSubjectKeys) {
    let label = subjectKey;

    if (isLegacyStudyPlanSubject(subjectKey)) {
      label = LEGACY_SUBJECT_LABELS[subjectKey];
    } else if (subjectKey.startsWith(EXAM_PREP_TEMPLATE_SUBJECT_LABEL_PREFIX)) {
      label = subjectKey.slice(EXAM_PREP_TEMPLATE_SUBJECT_LABEL_PREFIX.length);
    }

    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }

  return labels;
}

export function applyTemplateToRound(
  plans: ExamPrepWeeklyPlans,
  template: Pick<ExamPrepWeeklyPlanTemplate, 'weeks' | 'weekCount'>,
  roundSlot: ExamRoundSlot,
  subjects: UserSubject[],
  targetWeekCount: number,
  mode: ExamPrepTemplateApplyMode = 'overwrite'
): ApplyExamPrepTemplateResult {
  const keyToSubjectId = buildTemplateSubjectKeyIndex(subjects);
  const skippedSubjectKeys = new Set<string>();
  let nextPlans = plans;
  let appliedWeekCount = 0;
  const weeksToApply = Math.min(targetWeekCount, template.weekCount);
  const targetPrepWeeks = listPrepWeekNumbers(targetWeekCount);
  const templateWeeks = resolveTemplateWeeksForApply(template);

  for (let ordinal = 1; ordinal <= weeksToApply; ordinal++) {
    const templateWeek = getTemplateWeekByOrdinal(templateWeeks, ordinal);
    if (!templateWeek) {
      continue;
    }

    const targetWeekNumber = targetPrepWeeks[ordinal - 1];
    if (targetWeekNumber === undefined) {
      continue;
    }

    let weekApplied = false;

    for (const [subjectKey, content] of Object.entries(templateWeek)) {
      const subjectId = keyToSubjectId.get(subjectKey);

      if (!subjectId) {
        skippedSubjectKeys.add(subjectKey);
        continue;
      }

      const currentContent =
        getExamPrepWeeklyPlanContent(
          nextPlans,
          roundSlot,
          targetWeekNumber,
          subjectId
        ) ?? '';

      if (mode === 'fill-empty' && currentContent.trim()) {
        continue;
      }

      nextPlans = writeRoundWeekContent(
        nextPlans,
        roundSlot,
        targetWeekNumber,
        subjectId,
        content
      );
      weekApplied = true;
    }

    if (weekApplied) {
      appliedWeekCount += 1;
    }
  }

  for (const weekSubjects of Object.values(template.weeks)) {
    for (const subjectKey of Object.keys(weekSubjects ?? {})) {
      if (!keyToSubjectId.has(subjectKey)) {
        skippedSubjectKeys.add(subjectKey);
      }
    }
  }

  return {
    plans: nextPlans,
    skippedSubjectKeys: [...skippedSubjectKeys].sort(),
    appliedWeekCount,
  };
}

export function appendExamPrepWeeklyPlanTemplate(
  templates: ExamPrepWeeklyPlanTemplate[],
  input: ExamPrepWeeklyPlanTemplateCreateInput
): { templates: ExamPrepWeeklyPlanTemplate[]; template: ExamPrepWeeklyPlanTemplate } | { error: string } {
  if (templates.length >= MAX_EXAM_PREP_WEEKLY_PLAN_TEMPLATES) {
    return {
      error: `템플릿은 최대 ${MAX_EXAM_PREP_WEEKLY_PLAN_TEMPLATES}개까지 저장할 수 있습니다.`,
    };
  }

  const template: ExamPrepWeeklyPlanTemplate = {
    id: randomUUID(),
    name: resolveUniqueTemplateName(input.name, templates),
    weekCount: input.weekCount,
    createdAt: new Date().toISOString(),
    weeks: input.weeks,
  };

  return {
    templates: resolveExamPrepWeeklyPlanTemplates([template, ...templates]),
    template,
  };
}

export function removeExamPrepWeeklyPlanTemplate(
  templates: ExamPrepWeeklyPlanTemplate[],
  templateId: string
): { templates: ExamPrepWeeklyPlanTemplate[] } | { error: string } {
  const normalizedId = templateId.trim();

  if (!normalizedId) {
    return { error: '템플릿을 찾을 수 없습니다.' };
  }

  const nextTemplates = templates.filter((template) => template.id !== normalizedId);

  if (nextTemplates.length === templates.length) {
    return { error: '템플릿을 찾을 수 없습니다.' };
  }

  return {
    templates: nextTemplates,
  };
}
