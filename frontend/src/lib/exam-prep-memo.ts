export const EXAM_PREP_MEMO_EVENT_TYPE = 'exam-prep-memo' as const;

export function isExamPrepMemoEvent(extendedProps: Record<string, unknown>): boolean {
  return extendedProps.type === EXAM_PREP_MEMO_EVENT_TYPE;
}
