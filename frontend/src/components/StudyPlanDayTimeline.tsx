'use client';

import { useMemo, type CSSProperties } from 'react';
import type { EventInput } from '@fullcalendar/core';
import { TimelineSkeleton } from '@/components/skeletons/MobileSkeletons';
import { useProfileSubjectsContext } from '@/contexts/ProfileSubjectsContext';
import {
  blocksToRowSegments,
  buildExecutedTodoBlocks,
  buildPlannedTodoBlocks,
  buildScheduleBlocks,
  formatHourRowLabel,
  getTimelineHourLabels,
  MINUTE_COLUMN_LABELS,
  partitionScheduleEventsByDate,
  TIMELINE_ROW_COUNT,
  type BlockRowSegment,
  type DayViewMode,
  type TimelineBlockKind,
} from '@/lib/day-timeline';
import type {
  ExpandedStudyPlanTodoEvent,
  LegacyStudyPlanSubject,
  StudyPlanTodo,
} from '@/lib/study-plan-todo';
import { resolveSubjectCategory, type ProfileSubjectsInput } from '@/lib/user-subject';

interface StudyPlanDayTimelineProps {
  selectedDate: string;
  viewMode: DayViewMode;
  onViewModeChange: (mode: DayViewMode) => void;
  dayTodos: ExpandedStudyPlanTodoEvent[];
  todosById: Map<number, StudyPlanTodo>;
  scheduleEvents: EventInput[];
  loading?: boolean;
}

const BLOCK_KIND_LABELS: Record<TimelineBlockKind, string> = {
  school: '학교',
  'user-managed': '공부 가능',
  'user-academy': '학원',
  'user-fixed': '고정',
  'user-other': '기타',
  planned: '스터디 플랜',
  executed: '실행',
};

const LEGEND_ITEMS: Record<
  DayViewMode,
  { kind: TimelineBlockKind; label: string; className: string }[]
> = {
  planned: [
    { kind: 'school', label: '학교', className: 'day-slot-legend-school' },
    { kind: 'user-academy', label: '학원', className: 'day-slot-legend-academy' },
    { kind: 'user-fixed', label: '고정', className: 'day-slot-legend-fixed' },
    { kind: 'planned', label: '스터디 플랜', className: 'day-slot-legend-planned' },
  ],
  executed: [
    { kind: 'executed', label: '실행', className: 'day-slot-legend-executed' },
  ],
  combined: [
    { kind: 'school', label: '학교', className: 'day-slot-legend-school' },
    { kind: 'user-academy', label: '학원', className: 'day-slot-legend-academy' },
    { kind: 'user-fixed', label: '고정', className: 'day-slot-legend-fixed' },
    { kind: 'planned', label: '스터디 플랜', className: 'day-slot-legend-planned' },
    { kind: 'executed', label: '실행', className: 'day-slot-legend-executed' },
  ],
};

const SUBJECT_SLOT_CLASSES: Record<LegacyStudyPlanSubject, string> = {
  korean: 'day-slot-subject-korean',
  english: 'day-slot-subject-english',
  math: 'day-slot-subject-math',
  social: 'day-slot-subject-social',
  science: 'day-slot-subject-science',
  ethics: 'day-slot-subject-ethics',
  tech_home: 'day-slot-subject-tech_home',
  info: 'day-slot-subject-info',
  history: 'day-slot-subject-history',
  chinese: 'day-slot-subject-chinese',
  other: 'day-slot-subject-other',
};

const SUBJECT_PLANNED_BAR_CLASSES: Record<LegacyStudyPlanSubject, string> = {
  korean: 'day-slot-bar-subject-korean-planned',
  english: 'day-slot-bar-subject-english-planned',
  math: 'day-slot-bar-subject-math-planned',
  social: 'day-slot-bar-subject-social-planned',
  science: 'day-slot-bar-subject-science-planned',
  ethics: 'day-slot-bar-subject-ethics-planned',
  tech_home: 'day-slot-bar-subject-tech_home-planned',
  info: 'day-slot-bar-subject-info-planned',
  history: 'day-slot-bar-subject-history-planned',
  chinese: 'day-slot-bar-subject-chinese-planned',
  other: 'day-slot-bar-subject-other-planned',
};

const SUBJECT_EXECUTED_BAR_CLASSES: Record<LegacyStudyPlanSubject, string> = {
  korean: 'day-slot-bar-subject-korean-executed',
  english: 'day-slot-bar-subject-english-executed',
  math: 'day-slot-bar-subject-math-executed',
  social: 'day-slot-bar-subject-social-executed',
  science: 'day-slot-bar-subject-science-executed',
  ethics: 'day-slot-bar-subject-ethics-executed',
  tech_home: 'day-slot-bar-subject-tech_home-executed',
  info: 'day-slot-bar-subject-info-executed',
  history: 'day-slot-bar-subject-history-executed',
  chinese: 'day-slot-bar-subject-chinese-executed',
  other: 'day-slot-bar-subject-other-executed',
};

const VIEW_MODE_DESCRIPTIONS: Record<DayViewMode, string> = {
  planned: '학교·학원·고정 일정과 스터디 플랜 (실행 제외)',
  executed: '실행 기록만',
  combined: '일과 + 실행(진한 과목색) 겹쳐 표시',
};

type BarLayer = 'schedule' | 'planned' | 'executed';

function resolveSegmentInnerClassName(
  segment: BlockRowSegment,
  layer: BarLayer,
  subjects?: ProfileSubjectsInput
): string {
  const classes = [
    'day-slot-continuous-inner',
    `day-slot-continuous-${layer}`,
    `day-slot-${segment.kind}`,
  ];

  if (segment.isFirst) {
    classes.push('day-slot-continuous-start');
  }

  if (segment.isLast) {
    classes.push('day-slot-continuous-end');
  }

  if (segment.isFirst && segment.isLast) {
    classes.push('day-slot-continuous-single');
  }

  if (layer === 'schedule' && segment.kind === 'school' && segment.subject) {
    classes.push(SUBJECT_SLOT_CLASSES[resolveSubjectCategory(segment.subject, subjects)]);
  }

  if (layer === 'planned' && segment.subject) {
    classes.push(
      SUBJECT_PLANNED_BAR_CLASSES[resolveSubjectCategory(segment.subject, subjects)]
    );
  } else if (layer === 'planned') {
    classes.push('day-slot-planned-default');
  }

  if (layer === 'executed' && segment.subject) {
    classes.push(
      SUBJECT_EXECUTED_BAR_CLASSES[resolveSubjectCategory(segment.subject, subjects)]
    );
  } else if (layer === 'executed') {
    classes.push('day-slot-executed-default');
  }

  return classes.join(' ');
}

function resolveSegmentPositionStyle(segment: BlockRowSegment): CSSProperties {
  return {
    gridRow: segment.row + 2,
    gridColumn: `${segment.colStart + 2} / span ${segment.colSpan}`,
  };
}

function ContinuousBar({
  segment,
  layer,
  subjects,
  labelKind,
}: {
  segment: BlockRowSegment;
  layer: BarLayer;
  subjects?: ProfileSubjectsInput;
  labelKind?: TimelineBlockKind;
}) {
  const labelClassKind = labelKind ?? segment.kind;

  return (
    <div
      className={`day-slot-continuous-bar day-slot-continuous-bar-${layer}`}
      style={resolveSegmentPositionStyle(segment)}
      title={`${BLOCK_KIND_LABELS[segment.kind]}: ${segment.title}`}
      aria-label={`${BLOCK_KIND_LABELS[segment.kind]} ${segment.title}`}
    >
      <div className={resolveSegmentInnerClassName(segment, layer, subjects)}>
        {segment.isFirst ? (
          <span className={`day-slot-continuous-label day-slot-continuous-label-${labelClassKind}`}>
            {segment.title}
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface TimelineChartProps {
  hourLabels: readonly number[];
  viewMode: DayViewMode;
  scheduleSegments: BlockRowSegment[];
  plannedSegments: BlockRowSegment[];
  executedSegments: BlockRowSegment[];
  subjects?: ProfileSubjectsInput;
}

function TimelineChart({
  hourLabels,
  viewMode,
  scheduleSegments,
  plannedSegments,
  executedSegments,
  subjects,
}: TimelineChartProps) {
  const isCombined = viewMode === 'combined';
  const isExecutedOnly = viewMode === 'executed';
  const showSchedule = viewMode === 'planned' || isCombined;
  const showPlanned = !isExecutedOnly;
  const showExecuted = viewMode !== 'planned';

  return (
    <div
      className={`day-slot-chart${isCombined ? ' day-slot-chart-combined' : ''}`}
      style={
        {
          '--day-slot-rows': TIMELINE_ROW_COUNT,
        } as CSSProperties
      }
    >
      <div className="day-slot-corner" />
      {MINUTE_COLUMN_LABELS.map((minute, colIndex) => (
        <div
          key={minute}
          className="day-slot-minute-header"
          style={{ gridRow: 1, gridColumn: colIndex + 2 }}
        >
          {minute}
        </div>
      ))}

      {hourLabels.map((hour, rowIndex) => (
        <div
          key={`hour-${hour}`}
          className="day-slot-hour-header"
          style={{ gridRow: rowIndex + 2, gridColumn: 1 }}
        >
          {formatHourRowLabel(hour)}
        </div>
      ))}

      {hourLabels.map((hour, rowIndex) =>
        MINUTE_COLUMN_LABELS.map((minute, colIndex) => (
          <div
            key={`grid-${hour}-${minute}`}
            className="day-slot-grid-cell"
            style={{ gridRow: rowIndex + 2, gridColumn: colIndex + 2 }}
            aria-hidden="true"
          />
        ))
      )}

      {showSchedule
        ? scheduleSegments.map((segment) => (
            <ContinuousBar
              key={`schedule-${segment.blockId}-${segment.row}-${segment.colStart}`}
              segment={segment}
              layer="schedule"
              subjects={subjects}
            />
          ))
        : null}

      {showPlanned
        ? plannedSegments.map((segment) => (
            <ContinuousBar
              key={`planned-${segment.blockId}-${segment.row}-${segment.colStart}`}
              segment={segment}
              layer="planned"
              subjects={subjects}
              labelKind="planned"
            />
          ))
        : null}

      {showExecuted
        ? executedSegments.map((segment) => (
            <ContinuousBar
              key={`executed-${segment.blockId}-${segment.row}-${segment.colStart}`}
              segment={segment}
              layer="executed"
              subjects={subjects}
              labelKind="executed"
            />
          ))
        : null}
    </div>
  );
}

function AllDayScheduleStrip({ events }: { events: EventInput[] }) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="day-slot-allday-strip">
      {events.map((event) => {
        const type = (event.extendedProps as Record<string, unknown> | undefined)?.type;
        const isExam = type === 'school-exam';
        const isHoliday = type === 'school-holiday';

        return (
          <span
            key={String(event.id)}
            className={`day-slot-allday-badge${
              isExam ? ' day-slot-allday-exam' : isHoliday ? ' day-slot-allday-holiday' : ''
            }`}
            title={String(event.title ?? '')}
          >
            {String(event.title ?? '')}
          </span>
        );
      })}
    </div>
  );
}

function DayViewModeToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: DayViewMode;
  onViewModeChange: (mode: DayViewMode) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">일과 표시</legend>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="radio"
            name="dayViewMode"
            checked={viewMode === 'combined'}
            onChange={() => onViewModeChange('combined')}
            className="h-3.5 w-3.5"
          />
          모두
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="radio"
            name="dayViewMode"
            checked={viewMode === 'planned'}
            onChange={() => onViewModeChange('planned')}
            className="h-3.5 w-3.5"
          />
          일과만
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="radio"
            name="dayViewMode"
            checked={viewMode === 'executed'}
            onChange={() => onViewModeChange('executed')}
            className="h-3.5 w-3.5"
          />
          실행만
        </label>
      </div>
    </fieldset>
  );
}

function TimelineLegend({ viewMode }: { viewMode: DayViewMode }) {
  return (
    <div className="day-slot-legend">
      {LEGEND_ITEMS[viewMode].map((item) => (
        <span key={item.kind} className="day-slot-legend-item">
          <span className={`day-slot-legend-swatch ${item.className}`} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export default function StudyPlanDayTimeline({
  selectedDate,
  viewMode,
  onViewModeChange,
  dayTodos,
  todosById,
  scheduleEvents,
  loading = false,
}: StudyPlanDayTimelineProps) {
  const { subjects: profileSubjects } = useProfileSubjectsContext();
  const hourLabels = getTimelineHourLabels();

  const { allDay: allDayEvents } = useMemo(
    () => partitionScheduleEventsByDate(scheduleEvents, selectedDate),
    [scheduleEvents, selectedDate]
  );

  const scheduleBlocks = useMemo(
    () => buildScheduleBlocks(scheduleEvents, selectedDate),
    [scheduleEvents, selectedDate]
  );

  const plannedBlocks = useMemo(
    () => buildPlannedTodoBlocks(dayTodos),
    [dayTodos]
  );

  const executedBlocks = useMemo(
    () => buildExecutedTodoBlocks(dayTodos, todosById),
    [dayTodos, todosById]
  );

  const scheduleSegments = useMemo(
    () => blocksToRowSegments(scheduleBlocks),
    [scheduleBlocks]
  );
  const plannedSegments = useMemo(
    () => blocksToRowSegments(plannedBlocks),
    [plannedBlocks]
  );
  const executedSegments = useMemo(
    () => blocksToRowSegments(executedBlocks),
    [executedBlocks]
  );

  const showScheduleLayer = viewMode === 'planned' || viewMode === 'combined';

  return (
    <div className="day-slot-panel flex h-full min-w-0 w-full max-w-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            하루 일과
          </p>
          <DayViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
        </div>
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          05:00 ~ 다음날 04:00 · 10분 단위 · {VIEW_MODE_DESCRIPTIONS[viewMode]}
        </p>
        <TimelineLegend viewMode={viewMode} />
      </div>

      {!loading && allDayEvents.length > 0 ? (
        <AllDayScheduleStrip events={allDayEvents} />
      ) : null}

      <div className="day-slot-scroll min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
        {loading ? (
          <TimelineSkeleton />
        ) : (
          <TimelineChart
            hourLabels={hourLabels}
            viewMode={viewMode}
            scheduleSegments={showScheduleLayer ? scheduleSegments : []}
            plannedSegments={viewMode === 'executed' ? [] : plannedSegments}
            executedSegments={viewMode === 'planned' ? [] : executedSegments}
            subjects={profileSubjects}
          />
        )}
      </div>
    </div>
  );
}
