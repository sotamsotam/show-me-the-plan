import type { EventInput } from '@fullcalendar/core';
import {
  DAY_ANCHOR_MINUTES,
  durationBetweenIso,
  durationBetweenTimes,
  isoToDayOffset,
  toDayOffsetMinutes,
} from '@/lib/schedule-time';
import {
  filterEventsByDate,
  formatStudyPlanEventTitle,
  getExecutionRecord,
  type ExpandedStudyPlanTodoEvent,
  type StudyPlanExecutionRecord,
  type PlanSubjectKey,
  type StudyPlanTodo,
} from '@/lib/study-plan-todo';

export {
  DAY_ANCHOR_MINUTES,
  durationBetweenIso,
  durationBetweenTimes,
  isoToDayOffset,
  toDayOffsetMinutes,
} from '@/lib/schedule-time';

export type DayViewMode = 'planned' | 'executed' | 'combined';

export type TimelineBlockKind =
  | 'school'
  | 'user-managed'
  | 'user-academy'
  | 'user-fixed'
  | 'user-other'
  | 'planned'
  | 'executed';

export interface TimelineBlock {
  id: string;
  kind: TimelineBlockKind;
  title: string;
  startMinutes: number;
  endMinutes: number;
  subject?: PlanSubjectKey;
}

export const DAY_TOTAL_MINUTES = 23 * 60;
export const SLOTS_PER_HOUR = 6;
export const SLOT_MINUTES = 10;
export const TOTAL_DAY_SLOTS = (DAY_TOTAL_MINUTES / SLOT_MINUTES);

export const MINUTE_COLUMN_LABELS = [10, 20, 30, 40, 50, 60] as const;

export const SCHEDULE_TIMELINE_KINDS: readonly TimelineBlockKind[] = [
  'school',
  'user-managed',
  'user-academy',
  'user-fixed',
  'user-other',
] as const;

const KIND_PRIORITY: Record<TimelineBlockKind, number> = {
  school: 0,
  'user-managed': 1,
  'user-other': 1,
  'user-academy': 2,
  'user-fixed': 2,
  planned: 3,
  executed: 4,
};

export interface SlotCellState {
  kind: TimelineBlockKind | null;
  subject?: PlanSubjectKey;
  titles: string[];
}

export interface BlockLabelMarker {
  blockId: string;
  kind: TimelineBlockKind;
  title: string;
  subject?: PlanSubjectKey;
  row: number;
  col: number;
}

export interface BlockRowSegment {
  blockId: string;
  kind: TimelineBlockKind;
  title: string;
  subject?: PlanSubjectKey;
  row: number;
  colStart: number;
  colSpan: number;
  isFirst: boolean;
  isLast: boolean;
}

const HOUR_LABELS = [
  ...Array.from({ length: 19 }, (_, index) => 5 + index),
  ...Array.from({ length: 4 }, (_, index) => index),
] as const;

export function formatDurationMinutes(minutes: number): string {
  if (minutes <= 0) {
    return '0분';
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return `${remainder}분`;
  }

  if (remainder === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${remainder}분`;
}

export function isExecutedOnTimeline(
  execution?: StudyPlanExecutionRecord
): execution is StudyPlanExecutionRecord & {
  executedStartTime: string;
  executedEndTime: string;
} {
  return (
    execution != null &&
    execution.status !== 'incomplete' &&
    !!execution.executedStartTime &&
    !!execution.executedEndTime
  );
}

export function getEventDate(event: EventInput): string {
  const date = event.extendedProps?.date;

  if (typeof date === 'string' && date.length >= 10) {
    return date.slice(0, 10);
  }

  return String(event.start).slice(0, 10);
}

export function filterScheduleEventsByDate(
  events: EventInput[],
  date: string
): EventInput[] {
  return events
    .filter((event) => getEventDate(event) === date)
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));
}

export function isAllDayScheduleEvent(event: EventInput): boolean {
  if (event.allDay) {
    return true;
  }

  const type = (event.extendedProps as Record<string, unknown> | undefined)?.type;
  return type === 'school-exam' || type === 'school-holiday';
}

export function partitionScheduleEventsByDate(
  events: EventInput[],
  date: string
): { timed: EventInput[]; allDay: EventInput[] } {
  const timed: EventInput[] = [];
  const allDay: EventInput[] = [];

  for (const event of filterScheduleEventsByDate(events, date)) {
    if (isAllDayScheduleEvent(event)) {
      allDay.push(event);
    } else {
      timed.push(event);
    }
  }

  return { timed, allDay };
}

function resolveSubjectFromClassNames(classNames: string[]): PlanSubjectKey | undefined {
  const subjectClass = classNames.find((name) => name.startsWith('subject-'));

  if (!subjectClass) {
    return undefined;
  }

  return subjectClass.replace('subject-', '') as PlanSubjectKey;
}

function resolveScheduleBlockKind(classNames: string[]): TimelineBlockKind | null {
  if (classNames.includes('school-event')) {
    return 'school';
  }

  if (classNames.includes('user-event-fixed')) {
    return 'user-fixed';
  }

  if (classNames.includes('user-event-academy')) {
    return 'user-academy';
  }

  if (classNames.includes('user-event-other')) {
    return 'user-other';
  }

  if (classNames.includes('user-event-managed') || classNames.includes('user-event')) {
    return 'user-managed';
  }

  return null;
}

function eventToScheduleBlock(event: EventInput): TimelineBlock | null {
  const classNames = Array.isArray(event.classNames)
    ? event.classNames.map(String)
    : event.classNames
      ? [String(event.classNames)]
      : [];
  const kind = resolveScheduleBlockKind(classNames);

  if (!kind) {
    return null;
  }

  const startMinutes = isoToDayOffset(String(event.start));
  const endMinutes = isoToDayOffset(String(event.end));

  if (endMinutes <= startMinutes) {
    return null;
  }

  return {
    id: String(event.id ?? `${kind}-${event.start}`),
    kind,
    title: String(event.title ?? ''),
    startMinutes,
    endMinutes,
    subject: resolveSubjectFromClassNames(classNames),
  };
}

export function buildScheduleBlocks(
  events: EventInput[],
  date: string
): TimelineBlock[] {
  const { timed } = partitionScheduleEventsByDate(events, date);
  const blocks: TimelineBlock[] = [];

  for (const event of timed) {
    const block = eventToScheduleBlock(event);

    if (block) {
      blocks.push(block);
    }
  }

  return blocks.sort((a, b) => a.startMinutes - b.startMinutes);
}

function plannedTodoToBlock(event: ExpandedStudyPlanTodoEvent): TimelineBlock | null {
  const startMinutes = isoToDayOffset(event.start);
  const endMinutes = isoToDayOffset(event.end);

  if (endMinutes <= startMinutes) {
    return null;
  }

  return {
    id: `planned-${event.id}`,
    kind: 'planned',
    title: formatStudyPlanEventTitle(event.subject, event.title),
    startMinutes,
    endMinutes,
    subject: event.subject,
  };
}

function executedTodoToBlock(
  event: ExpandedStudyPlanTodoEvent,
  execution: StudyPlanExecutionRecord & {
    executedStartTime: string;
    executedEndTime: string;
  }
): TimelineBlock | null {
  const startMinutes = toDayOffsetMinutes(execution.executedStartTime);
  const endMinutes = toDayOffsetMinutes(execution.executedEndTime);

  if (endMinutes <= startMinutes) {
    return null;
  }

  return {
    id: `executed-${event.id}`,
    kind: 'executed',
    title: formatStudyPlanEventTitle(event.subject, event.title),
    startMinutes,
    endMinutes,
    subject: event.subject,
  };
}

export function buildPlannedTodoBlocks(
  dayTodos: ExpandedStudyPlanTodoEvent[]
): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];

  for (const todo of dayTodos) {
    const planned = plannedTodoToBlock(todo);

    if (planned) {
      blocks.push(planned);
    }
  }

  return blocks.sort((a, b) => a.startMinutes - b.startMinutes);
}

export function buildExecutedTodoBlocks(
  dayTodos: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>
): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];

  for (const todo of dayTodos) {
    const execution = getExecutionRecord(todosById.get(todo.todoId), todo.date);

    if (!isExecutedOnTimeline(execution)) {
      continue;
    }

    const executed = executedTodoToBlock(todo, execution);

    if (executed) {
      blocks.push(executed);
    }
  }

  return blocks.sort((a, b) => a.startMinutes - b.startMinutes);
}

export function buildTimelineBlocks(
  dayTodos: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  viewMode: Exclude<DayViewMode, 'combined'>,
  scheduleEvents: EventInput[] = [],
  date = ''
): TimelineBlock[] {
  if (viewMode === 'planned') {
    const planned = buildPlannedTodoBlocks(dayTodos);

    if (!date) {
      return planned;
    }

    return [...buildScheduleBlocks(scheduleEvents, date), ...planned].sort(
      (a, b) => a.startMinutes - b.startMinutes
    );
  }

  return buildExecutedTodoBlocks(dayTodos, todosById);
}

export function computeBlockLabelMarkers(blocks: TimelineBlock[]): BlockLabelMarker[] {
  return blocks.map((block) => {
    const startSlot = Math.floor(block.startMinutes / SLOT_MINUTES);
    const row = Math.floor(startSlot / SLOTS_PER_HOUR);
    const col = startSlot % SLOTS_PER_HOUR;

    return {
      blockId: block.id,
      kind: block.kind,
      title: block.title,
      subject: block.subject,
      row,
      col,
    };
  });
}

export function findBlockLabelMarker(
  markers: BlockLabelMarker[],
  row: number,
  col: number
): BlockLabelMarker | undefined {
  return markers.find((marker) => marker.row === row && marker.col === col);
}

export function blockToRowSegments(block: TimelineBlock): BlockRowSegment[] {
  const startSlot = Math.floor(block.startMinutes / SLOT_MINUTES);
  const endSlot = Math.min(
    Math.ceil(block.endMinutes / SLOT_MINUTES),
    TOTAL_DAY_SLOTS
  );

  if (endSlot <= startSlot) {
    return [];
  }

  const segments: BlockRowSegment[] = [];
  let slot = startSlot;

  while (slot < endSlot) {
    const row = Math.floor(slot / SLOTS_PER_HOUR);
    const colStart = slot % SLOTS_PER_HOUR;
    const rowEndSlot = (row + 1) * SLOTS_PER_HOUR;
    const segmentEndSlot = Math.min(endSlot, rowEndSlot);
    const colSpan = segmentEndSlot - slot;

    segments.push({
      blockId: block.id,
      kind: block.kind,
      title: block.title,
      subject: block.subject,
      row,
      colStart,
      colSpan,
      isFirst: slot === startSlot,
      isLast: segmentEndSlot === endSlot,
    });

    slot = segmentEndSlot;
  }

  return segments;
}

export function blocksToRowSegments(blocks: TimelineBlock[]): BlockRowSegment[] {
  return blocks.flatMap(blockToRowSegments);
}

export const TIMELINE_ROW_COUNT = HOUR_LABELS.length;

export function calculatePlannedStudyMinutes(
  events: ExpandedStudyPlanTodoEvent[],
  date: string
): number {
  return filterEventsByDate(events, date).reduce((total, event) => {
    const duration = durationBetweenIso(event.start, event.end);
    return duration > 0 ? total + duration : total;
  }, 0);
}

export function calculateExecutedStudyMinutes(
  events: ExpandedStudyPlanTodoEvent[],
  date: string,
  todosById: Map<number, StudyPlanTodo>
): number {
  return filterEventsByDate(events, date).reduce((total, event) => {
    const execution = getExecutionRecord(todosById.get(event.todoId), event.date);

    if (!isExecutedOnTimeline(execution)) {
      return total;
    }

    const duration = durationBetweenTimes(
      execution.executedStartTime,
      execution.executedEndTime
    );

    return duration > 0 ? total + duration : total;
  }, 0);
}

export function countExecutedTodos(
  events: ExpandedStudyPlanTodoEvent[],
  date: string,
  todosById: Map<number, StudyPlanTodo>
): number {
  return filterEventsByDate(events, date).filter((event) =>
    isExecutedOnTimeline(getExecutionRecord(todosById.get(event.todoId), event.date))
  ).length;
}

export function getTimelineHourLabels(): readonly number[] {
  return HOUR_LABELS;
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function formatHourRowLabel(hour: number): string {
  return String(hour).padStart(2, '0');
}

function createEmptySlotGrid(): SlotCellState[][] {
  return Array.from({ length: HOUR_LABELS.length }, () =>
    Array.from({ length: SLOTS_PER_HOUR }, () => ({
      kind: null,
      titles: [],
    }))
  );
}

export function buildSlotGrid(blocks: TimelineBlock[]): SlotCellState[][] {
  const grid = createEmptySlotGrid();

  for (const block of blocks) {
    const startSlot = Math.floor(block.startMinutes / SLOT_MINUTES);
    const endSlot = Math.min(
      Math.ceil(block.endMinutes / SLOT_MINUTES),
      TOTAL_DAY_SLOTS
    );

    for (let slot = startSlot; slot < endSlot; slot += 1) {
      const row = Math.floor(slot / SLOTS_PER_HOUR);
      const col = slot % SLOTS_PER_HOUR;

      if (row >= HOUR_LABELS.length) {
        continue;
      }

      const cell = grid[row][col];
      const blockPriority = KIND_PRIORITY[block.kind];
      const cellPriority = cell.kind ? KIND_PRIORITY[cell.kind] : -1;

      if (blockPriority > cellPriority) {
        cell.kind = block.kind;
        cell.subject = block.subject;
        cell.titles = [block.title];
      } else if (blockPriority === cellPriority) {
        if (block.subject) {
          cell.subject = block.subject;
        }

        if (!cell.titles.includes(block.title)) {
          cell.titles.push(block.title);
        }
      } else if (!cell.titles.includes(block.title)) {
        cell.titles.push(block.title);
      }
    }
  }

  return grid;
}

export function formatSlotCellTooltip(cell: SlotCellState): string | undefined {
  if (cell.titles.length === 0) {
    return undefined;
  }

  return cell.titles.join('\n');
}
