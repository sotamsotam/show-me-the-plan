export type CalendarEditHintVariant = 'draft' | 'select';

export interface CalendarEditHintModel {
  key: string;
  variant: CalendarEditHintVariant;
  title: string;
  description: string;
}

interface BuildCalendarEditHintOptions {
  hasDraft: boolean;
  editSession: { eventId: string } | null;
  formOpen: boolean;
  isMobile: boolean;
  isListView: boolean;
  entityName: string;
  draftDescription: string;
}

export function buildCalendarEditHint(
  options: BuildCalendarEditHintOptions
): CalendarEditHintModel | null {
  const {
    hasDraft,
    editSession,
    formOpen,
    isMobile,
    isListView,
    entityName,
    draftDescription,
  } = options;

  if (formOpen || isListView) {
    return null;
  }

  if (hasDraft) {
    return {
      key: 'draft',
      variant: 'draft',
      title: `임시 ${entityName} 작성 중`,
      description: draftDescription,
    };
  }

  if (!editSession) {
    return null;
  }

  const interactionLabel = isMobile ? '다시 탭하면' : '다시 클릭하면';

  return {
    key: editSession.eventId,
    variant: 'select',
    title: `${entityName} 선택됨`,
    description: `선택된 일정을 드래그하거나 리사이즈하여 시간 날짜를 수정할 수 있습니다.  선택영역을 한번 더 클릭하면 상세 수정 창이 열립니다.`,
  };
}
