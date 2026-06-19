import type { VacationPeriodSlot } from '@/lib/vacation-period-settings';
import {
  getVacationWeeklyPlanContent,
  MAX_VACATION_WEEKLY_PLAN_CONTENT_LENGTH,
  MAX_VACATION_WEEKS,
  type VacationWeeklyPlans,
} from '@/lib/vacation-weekly-plan';
import {
  isLegacyStudyPlanSubject,
  LEGACY_SUBJECT_LABELS,
  type UserSubject,
} from '@/lib/user-subject';

export const MIN_VACATION_WEEKS = 1;
export const MAX_VACATION_WEEKLY_PLAN_TEMPLATE_NAME_LENGTH = 50;
export const MAX_VACATION_WEEKLY_PLAN_TEMPLATES = 20;
export const VACATION_TEMPLATE_SUBJECT_LABEL_PREFIX = 'label:';

export type VacationWeeklyPlanTemplateWeekSubjects = Record<string, string>;

export interface VacationWeeklyPlanTemplate {
  id: string;
  name: string;
  weekCount: number;
  createdAt: string;
  weeks: Partial<Record<string, VacationWeeklyPlanTemplateWeekSubjects>>;
}

export type VacationWeeklyPlanTemplateCreateInput = Pick<
  VacationWeeklyPlanTemplate,
  'name' | 'weekCount' | 'weeks'
>;

export interface VacationWeeklyPlanTemplatesResponse {
  vacationWeeklyPlanTemplates: VacationWeeklyPlanTemplate[];
}

export interface VacationWeeklyPlanTemplateSaveResponse {
  vacationWeeklyPlanTemplates: VacationWeeklyPlanTemplate[];
  template: VacationWeeklyPlanTemplate;
}

export function createEmptyVacationWeeklyPlanTemplates(): VacationWeeklyPlanTemplate[] {
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

  if (normalized.length > MAX_VACATION_WEEKLY_PLAN_CONTENT_LENGTH) {
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

  return `${VACATION_TEMPLATE_SUBJECT_LABEL_PREFIX}${normalizeTemplateSubjectLabel(subject.label)}`;
}

export function isValidTemplateSubjectKey(key: string): boolean {
  if (!key.trim()) {
    return false;
  }

  if (isLegacyStudyPlanSubject(key)) {
    return true;
  }

  if (!key.startsWith(VACATION_TEMPLATE_SUBJECT_LABEL_PREFIX)) {
    return false;
  }

  return normalizeTemplateSubjectLabel(
    key.slice(VACATION_TEMPLATE_SUBJECT_LABEL_PREFIX.length)
  ).length > 0;
}

function normalizeTemplateWeekSubjects(
  value: unknown
): VacationWeeklyPlanTemplateWeekSubjects | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const subjects: VacationWeeklyPlanTemplateWeekSubjects = {};

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
): Partial<Record<string, VacationWeeklyPlanTemplateWeekSubjects>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const weeks: Partial<Record<string, VacationWeeklyPlanTemplateWeekSubjects>> = {};

  for (const [weekKey, weekValue] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d+$/.test(weekKey)) {
      continue;
    }

    const weekNumber = Number(weekKey);
    if (
      !Number.isInteger(weekNumber) ||
      weekNumber < MIN_VACATION_WEEKS ||
      weekNumber > MAX_VACATION_WEEKS
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

  if (normalized.length > MAX_VACATION_WEEKLY_PLAN_TEMPLATE_NAME_LENGTH) {
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

  if (value < MIN_VACATION_WEEKS || value > MAX_VACATION_WEEKS) {
    return null;
  }

  return value;
}

function normalizeTemplateRecord(value: unknown): VacationWeeklyPlanTemplate | null {
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

export function resolveVacationWeeklyPlanTemplates(
  value: unknown
): VacationWeeklyPlanTemplate[] {
  if (!Array.isArray(value)) {
    return createEmptyVacationWeeklyPlanTemplates();
  }

  const templates: VacationWeeklyPlanTemplate[] = [];
  const seenIds = new Set<string>();

  for (const item of value) {
    const template = normalizeTemplateRecord(item);
    if (!template || seenIds.has(template.id)) {
      continue;
    }

    seenIds.add(template.id);
    templates.push(template);

    if (templates.length >= MAX_VACATION_WEEKLY_PLAN_TEMPLATES) {
      break;
    }
  }

  return templates.sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  );
}

export function countTemplateWeeksWithContent(
  weeks: Partial<Record<string, VacationWeeklyPlanTemplateWeekSubjects>>
): number {
  return Object.values(weeks).filter((weekSubjects) =>
    Object.values(weekSubjects ?? {}).some((content) => content.trim().length > 0)
  ).length;
}

export function countTemplateSubjectKeys(
  weeks: Partial<Record<string, VacationWeeklyPlanTemplateWeekSubjects>>
): number {
  const subjectKeys = new Set<string>();

  for (const weekSubjects of Object.values(weeks)) {
    for (const subjectKey of Object.keys(weekSubjects ?? {})) {
      subjectKeys.add(subjectKey);
    }
  }

  return subjectKeys.size;
}

export function validateCreateVacationWeeklyPlanTemplateInput(
  value: unknown
): { template: VacationWeeklyPlanTemplateCreateInput } | { error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '템플릿 형식이 올바르지 않습니다.' };
  }

  const record = value as Record<string, unknown>;
  const name = normalizeTemplateName(record.name);
  const weekCount = normalizeWeekCount(record.weekCount);
  const weeks = normalizeTemplateWeeks(record.weeks);

  if (name === null) {
    return {
      error: `템플릿 제목은 ${MAX_VACATION_WEEKLY_PLAN_TEMPLATE_NAME_LENGTH}자 이하여야 합니다.`,
    };
  }

  if (!name) {
    return { error: '템플릿 제목을 입력해 주세요.' };
  }

  if (weekCount === null) {
    return {
      error: `방학 주차는 ${MIN_VACATION_WEEKS}~${MAX_VACATION_WEEKS} 사이여야 합니다.`,
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
        error: `템플릿 주차는 방학 기간(${weekCount}주)을 초과할 수 없습니다.`,
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

export type VacationTemplateApplyMode = 'overwrite' | 'fill-empty';

export interface ApplyVacationTemplateResult {
  plans: VacationWeeklyPlans;
  skippedSubjectKeys: string[];
  appliedWeekCount: number;
}

function writePeriodWeekContent(
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot,
  weekNumber: number,
  subjectId: string,
  content: string
): VacationWeeklyPlans {
  const weekKey = String(weekNumber);
  const periodPlan = plans[periodKey] ?? { weeks: {} };
  const weekSubjects = { ...(periodPlan.weeks[weekKey] ?? {}) };

  if (content.trim()) {
    weekSubjects[subjectId] = content;
  } else {
    delete weekSubjects[subjectId];
  }

  const nextWeeks = { ...periodPlan.weeks };
  if (Object.keys(weekSubjects).length > 0) {
    nextWeeks[weekKey] = weekSubjects;
  } else {
    delete nextWeeks[weekKey];
  }

  const nextPlans = { ...plans };
  if (Object.keys(nextWeeks).length > 0) {
    nextPlans[periodKey] = { weeks: nextWeeks };
  } else {
    delete nextPlans[periodKey];
  }

  return nextPlans;
}

export function hasVacationPeriodContent(
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot
): boolean {
  const periodPlan = plans[periodKey];
  if (!periodPlan?.weeks) {
    return false;
  }

  for (const weekSubjects of Object.values(periodPlan.weeks)) {
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

export function extractPeriodToTemplateWeeks(
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot,
  subjects: UserSubject[],
  weekCount: number
): Partial<Record<string, VacationWeeklyPlanTemplateWeekSubjects>> {
  const weeks: Partial<Record<string, VacationWeeklyPlanTemplateWeekSubjects>> = {};

  for (let weekNumber = 1; weekNumber <= weekCount; weekNumber++) {
    const weekSubjects: VacationWeeklyPlanTemplateWeekSubjects = {};

    for (const subject of subjects) {
      const content =
        getVacationWeeklyPlanContent(plans, periodKey, weekNumber, subject.id) ?? '';

      if (content) {
        weekSubjects[buildTemplateSubjectKey(subject)] = content;
      }
    }

    if (Object.keys(weekSubjects).length > 0) {
      weeks[String(weekNumber)] = weekSubjects;
    }
  }

  return weeks;
}

export function extractPeriodToTemplateCreateInput(
  name: string,
  plans: VacationWeeklyPlans,
  periodKey: VacationPeriodSlot,
  subjects: UserSubject[],
  weekCount: number
): VacationWeeklyPlanTemplateCreateInput | null {
  const weeks = extractPeriodToTemplateWeeks(plans, periodKey, subjects, weekCount);

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
  templates: VacationWeeklyPlanTemplate[]
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
    } else if (subjectKey.startsWith(VACATION_TEMPLATE_SUBJECT_LABEL_PREFIX)) {
      label = subjectKey.slice(VACATION_TEMPLATE_SUBJECT_LABEL_PREFIX.length);
    }

    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }

  return labels;
}

export function applyTemplateToPeriod(
  plans: VacationWeeklyPlans,
  template: Pick<VacationWeeklyPlanTemplate, 'weeks' | 'weekCount'>,
  periodKey: VacationPeriodSlot,
  subjects: UserSubject[],
  targetWeekCount: number,
  mode: VacationTemplateApplyMode = 'overwrite'
): ApplyVacationTemplateResult {
  const keyToSubjectId = buildTemplateSubjectKeyIndex(subjects);
  const skippedSubjectKeys = new Set<string>();
  let nextPlans = plans;
  let appliedWeekCount = 0;
  const weeksToApply = Math.min(targetWeekCount, template.weekCount);

  for (let weekNumber = 1; weekNumber <= weeksToApply; weekNumber++) {
    const templateWeek = template.weeks[String(weekNumber)];
    if (!templateWeek) {
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
        getVacationWeeklyPlanContent(nextPlans, periodKey, weekNumber, subjectId) ?? '';

      if (mode === 'fill-empty' && currentContent.trim()) {
        continue;
      }

      nextPlans = writePeriodWeekContent(
        nextPlans,
        periodKey,
        weekNumber,
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

export function appendVacationWeeklyPlanTemplate(
  templates: VacationWeeklyPlanTemplate[],
  input: VacationWeeklyPlanTemplateCreateInput
): { templates: VacationWeeklyPlanTemplate[]; template: VacationWeeklyPlanTemplate } | { error: string } {
  if (templates.length >= MAX_VACATION_WEEKLY_PLAN_TEMPLATES) {
    return {
      error: `템플릿은 최대 ${MAX_VACATION_WEEKLY_PLAN_TEMPLATES}개까지 저장할 수 있습니다.`,
    };
  }

  const template: VacationWeeklyPlanTemplate = {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `template-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: resolveUniqueTemplateName(input.name, templates),
    weekCount: input.weekCount,
    createdAt: new Date().toISOString(),
    weeks: input.weeks,
  };

  return {
    templates: resolveVacationWeeklyPlanTemplates([template, ...templates]),
    template,
  };
}

export function removeVacationWeeklyPlanTemplate(
  templates: VacationWeeklyPlanTemplate[],
  templateId: string
): { templates: VacationWeeklyPlanTemplate[] } | { error: string } {
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
