import {
  EXAM_ROUND_SLOTS,
  MAX_EXAM_PREP_WEEKS,
  MIN_EXAM_PREP_WEEKS,
  type ExamPrepWeeksByRound,
  type ExamRoundSlot,
} from './exam-countdown';

export const MAX_EXAM_PREP_WEEKLY_PLAN_CONTENT_LENGTH = 500;

export type ExamPrepWeeklyPlanWeekSubjects = Record<string, string>;

export interface ExamPrepWeeklyPlanByRound {
  weeks: Partial<Record<string, ExamPrepWeeklyPlanWeekSubjects>>;
}

export type ExamPrepWeeklyPlans = Partial<Record<ExamRoundSlot, ExamPrepWeeklyPlanByRound>>;

export function createEmptyExamPrepWeeklyPlans(): ExamPrepWeeklyPlans {
  return {};
}

function isExamRoundSlot(value: string): value is ExamRoundSlot {
  return (EXAM_ROUND_SLOTS as readonly string[]).includes(value);
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

function normalizeWeekSubjects(
  value: unknown
): ExamPrepWeeklyPlanWeekSubjects | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const subjects: ExamPrepWeeklyPlanWeekSubjects = {};

  for (const [subjectId, content] of Object.entries(value as Record<string, unknown>)) {
    if (!subjectId.trim()) {
      continue;
    }

    const normalizedContent = normalizeWeekContent(content);
    if (normalizedContent === null) {
      return null;
    }

    if (normalizedContent) {
      subjects[subjectId] = normalizedContent;
    }
  }

  return subjects;
}

function normalizeWeeksByRound(
  value: unknown
): Partial<Record<string, ExamPrepWeeklyPlanWeekSubjects>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const weeks: Partial<Record<string, ExamPrepWeeklyPlanWeekSubjects>> = {};

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

    const subjects = normalizeWeekSubjects(weekValue);
    if (subjects === null) {
      return null;
    }

    if (Object.keys(subjects).length > 0) {
      weeks[String(weekNumber)] = subjects;
    }
  }

  return weeks;
}

export function resolveExamPrepWeeklyPlans(value: unknown): ExamPrepWeeklyPlans {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createEmptyExamPrepWeeklyPlans();
  }

  const plans: ExamPrepWeeklyPlans = {};

  for (const [slotKey, roundValue] of Object.entries(value as Record<string, unknown>)) {
    if (!isExamRoundSlot(slotKey)) {
      continue;
    }

    if (!roundValue || typeof roundValue !== 'object' || Array.isArray(roundValue)) {
      continue;
    }

    const weeksRecord = (roundValue as { weeks?: unknown }).weeks ?? roundValue;
    const weeks = normalizeWeeksByRound(weeksRecord);
    if (weeks === null) {
      continue;
    }

    if (Object.keys(weeks).length > 0) {
      plans[slotKey] = { weeks };
    }
  }

  return plans;
}

function getWeeksForSlot(slot: ExamRoundSlot, settings: ExamPrepWeeksByRound): number {
  return settings.weeksBySlot[slot] ?? settings.defaultWeeks;
}

export function validateExamPrepWeeklyPlansInput(
  value: unknown,
  options: {
    allowedSubjectIds: ReadonlySet<string>;
    examPrepWeeksByRound: ExamPrepWeeksByRound;
  }
): { plans: ExamPrepWeeklyPlans } | { error: string } {
  if (value === null || value === undefined) {
    return { plans: createEmptyExamPrepWeeklyPlans() };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'examPrepWeeklyPlans 형식이 올바르지 않습니다.' };
  }

  const plans: ExamPrepWeeklyPlans = {};

  for (const [slotKey, roundValue] of Object.entries(value as Record<string, unknown>)) {
    if (!isExamRoundSlot(slotKey)) {
      return { error: `지원하지 않는 시험 회차입니다: ${slotKey}` };
    }

    if (!roundValue || typeof roundValue !== 'object' || Array.isArray(roundValue)) {
      return { error: `${slotKey} 회차 데이터 형식이 올바르지 않습니다.` };
    }

    const weeksRecord = (roundValue as { weeks?: unknown }).weeks ?? roundValue;
    if (!weeksRecord || typeof weeksRecord !== 'object' || Array.isArray(weeksRecord)) {
      return { error: `${slotKey} 회차 주차 데이터 형식이 올바르지 않습니다.` };
    }

    const maxWeeks = getWeeksForSlot(slotKey, options.examPrepWeeksByRound);
    const weeks: Partial<Record<string, ExamPrepWeeklyPlanWeekSubjects>> = {};

    for (const [weekKey, weekValue] of Object.entries(weeksRecord as Record<string, unknown>)) {
      if (!/^\d+$/.test(weekKey)) {
        return { error: `${slotKey} 회차의 주차 번호 형식이 올바르지 않습니다.` };
      }

      const weekNumber = Number(weekKey);
      if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > maxWeeks) {
        return {
          error: `${slotKey} 회차는 1~${maxWeeks}주차까지만 입력할 수 있습니다.`,
        };
      }

      if (!weekValue || typeof weekValue !== 'object' || Array.isArray(weekValue)) {
        return { error: `${slotKey} 회차 ${weekNumber}주차 데이터 형식이 올바르지 않습니다.` };
      }

      const subjects: ExamPrepWeeklyPlanWeekSubjects = {};

      for (const [subjectId, content] of Object.entries(weekValue as Record<string, unknown>)) {
        if (!options.allowedSubjectIds.has(subjectId)) {
          return { error: `등록되지 않은 과목입니다: ${subjectId}` };
        }

        const normalizedContent = normalizeWeekContent(content);
        if (normalizedContent === null) {
          return {
            error: `내용은 ${MAX_EXAM_PREP_WEEKLY_PLAN_CONTENT_LENGTH}자 이하여야 합니다.`,
          };
        }

        if (normalizedContent) {
          subjects[subjectId] = normalizedContent;
        }
      }

      if (Object.keys(subjects).length > 0) {
        weeks[String(weekNumber)] = subjects;
      }
    }

    if (Object.keys(weeks).length > 0) {
      plans[slotKey] = { weeks };
    }
  }

  return { plans };
}

export function getExamPrepWeeklyPlanContent(
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot,
  weekNumber: number,
  subjectId: string
): string | null {
  const content = plans[roundSlot]?.weeks?.[String(weekNumber)]?.[subjectId];
  return content?.trim() ? content : null;
}
