import { createNeisSubjectId } from '@/lib/neis-subject-id';
import {
  findUserSubject,
  resolveSubjectCategory,
  type PlanSubjectKey,
  type ProfileSubjectsInput,
} from '@/lib/user-subject';
import { resolveSchoolSubject } from '@/lib/resolve-school-subject';

export interface ResolvedNeisTimetableSubject {
  neisLabel: string;
  displayLabel: string;
  styleSubjectKey: PlanSubjectKey;
  category: PlanSubjectKey;
}

export function resolveNeisTimetableSubject(
  neisLabel: string,
  subjects?: ProfileSubjectsInput
): ResolvedNeisTimetableSubject {
  const trimmed = neisLabel.trim();
  const neisSubjectId = createNeisSubjectId(trimmed);
  const profileSubject = findUserSubject(neisSubjectId, subjects);

  if (profileSubject) {
    const category = resolveSubjectCategory(neisSubjectId, subjects);
    return {
      neisLabel: trimmed,
      displayLabel: profileSubject.label,
      styleSubjectKey: neisSubjectId,
      category,
    };
  }

  const category = resolveSchoolSubject(trimmed);
  return {
    neisLabel: trimmed,
    displayLabel: trimmed,
    styleSubjectKey: category,
    category,
  };
}
