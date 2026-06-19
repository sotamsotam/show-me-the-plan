export interface StudyPlanTitleParts {
  selectedTextbook: string | null;
  selectedStudyMethod: string | null;
  rangeSuffix: string;
}

export function createEmptyStudyPlanTitleParts(): StudyPlanTitleParts {
  return {
    selectedTextbook: null,
    selectedStudyMethod: null,
    rangeSuffix: '',
  };
}

export function composeStudyPlanTitle(parts: StudyPlanTitleParts): string {
  return [
    parts.selectedTextbook,
    parts.selectedStudyMethod,
    parts.rangeSuffix.trim(),
  ]
    .filter(Boolean)
    .join(' ');
}

export function toggleStudyPlanTitleSelection(
  current: string | null,
  value: string
): string | null {
  return current === value ? null : value;
}
