'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { subjectClassName } from '@/lib/calendar-design-tokens';
import { buildSubjectPanelStyle } from '@/lib/subject-color';
import type { ExamPrepWeeklyPlansContext } from '@/lib/exam-prep-weekly-plans-context';
import type { VacationWeeklyPlansContext } from '@/lib/vacation-weekly-plans-context';
import { formatVacationWeekRange } from '@/lib/vacation-week-date-range';
import {
  resolveVisibleWeeklyPlanSections,
  type VisibleWeeklyPlanSection,
} from '@/lib/weekly-plan-panel';
import {
  isVisibleRangeInAnyExamPrepWeekPlanPeriod,
  type VisibleDateRange,
} from '@/lib/exam-prep-visible-week-plans';
import { isVisibleRangeInAnyVacationPeriod } from '@/lib/vacation-visible-week-plans';
import type { RegularWeeklyPlansContext } from '@/lib/regular-weekly-plans-context';
import { isVisibleRangeInAnyRegularPeriod } from '@/lib/regular-visible-week-plans';
import { getSubjectLabel } from '@/lib/user-subject';
import type { WeeklyPlanPlacementContext } from '@/lib/weekly-plan-placement';
import { readWeeklyPlanPlacementFromElement } from '@/lib/weekly-plan-placement';
import {
  formatUnachievedReasonLabel,
  type UnachievedWeeklyPlanItem,
} from '@/lib/exam-prep-weekly-plan-unachieved';
import { formatOccurrenceDateLabel } from '@/lib/user-schedule';

const EXAM_PREP_WEEKLY_PLAN_SETTINGS_HREF = '/dashboard/preferences/exam-prep-weekly-plan';
const VACATION_PERIOD_SETTINGS_HREF = '/dashboard/preferences/vacation-period';
const VACATION_WEEKLY_PLAN_SETTINGS_HREF = '/dashboard/preferences/vacation-weekly-plan';
const REGULAR_WEEKLY_PLAN_SETTINGS_HREF = '/dashboard/preferences/regular-weekly-plan';

function formatWeekRange(weekStart: string, weekEnd: string): string {
  return formatVacationWeekRange(weekStart, weekEnd);
}

export interface WeeklyPlanPanelProps {
  range: VisibleDateRange | null;
  examContext: ExamPrepWeeklyPlansContext;
  vacationContext: VacationWeeklyPlansContext;
  regularContext: RegularWeeklyPlansContext;
  sections?: VisibleWeeklyPlanSection[];
  loading?: boolean;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  placementItemId?: string | null;
  onItemClick?: (placement: WeeklyPlanPlacementContext) => void;
  unachievedItems?: UnachievedWeeklyPlanItem[];
  onCarryOverItem?: (item: UnachievedWeeklyPlanItem) => void;
  onDeleteUnachievedItem?: (item: UnachievedWeeklyPlanItem) => void;
}

function PanelEmptyState({
  inExamPeriod,
  inVacationPeriod,
  inRegularPeriod,
}: {
  inExamPeriod: boolean;
  inVacationPeriod: boolean;
  inRegularPeriod: boolean;
}) {
  return (
    <div className="exam-prep-panel-empty">
      <p>이번 주에 표시할 공부 계획이 없습니다.</p>
      <p>
        {inExamPeriod ? (
          <>
            <Link href={EXAM_PREP_WEEKLY_PLAN_SETTINGS_HREF} className="exam-prep-panel-empty-link">
              시험기간 주차별 공부계획 설정
            </Link>
            에서 입력할 수 있습니다.
          </>
        ) : inVacationPeriod ? (
          <>
            <Link href={VACATION_PERIOD_SETTINGS_HREF} className="exam-prep-panel-empty-link">
              방학기간 설정
            </Link>
            또는{' '}
            <Link
              href={VACATION_WEEKLY_PLAN_SETTINGS_HREF}
              className="exam-prep-panel-empty-link"
            >
              방학기간 주차별 공부계획 설정
            </Link>
            에서 입력할 수 있습니다.
          </>
        ) : inRegularPeriod ? (
          <>
            <Link href={REGULAR_WEEKLY_PLAN_SETTINGS_HREF} className="exam-prep-panel-empty-link">
              평소기간 주차별 공부계획 설정
            </Link>
            에서 입력할 수 있습니다.
          </>
        ) : (
          <>
            <Link href={EXAM_PREP_WEEKLY_PLAN_SETTINGS_HREF} className="exam-prep-panel-empty-link">
              시험기간 주차별 공부계획 설정
            </Link>
            ,{' '}
            <Link
              href={VACATION_WEEKLY_PLAN_SETTINGS_HREF}
              className="exam-prep-panel-empty-link"
            >
              방학기간 주차별 공부계획 설정
            </Link>
            또는{' '}
            <Link href={REGULAR_WEEKLY_PLAN_SETTINGS_HREF} className="exam-prep-panel-empty-link">
              평소기간 주차별 공부계획 설정
            </Link>
            에서 입력할 수 있습니다.
          </>
        )}
      </p>
    </div>
  );
}

function UnachievedSection({
  items,
  subjects,
  onCarryOverItem,
  onDeleteUnachievedItem,
}: {
  items: UnachievedWeeklyPlanItem[];
  subjects: ExamPrepWeeklyPlansContext['subjects'];
  onCarryOverItem?: (item: UnachievedWeeklyPlanItem) => void;
  onDeleteUnachievedItem?: (item: UnachievedWeeklyPlanItem) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="exam-prep-panel-unachieved mt-4 border-t border-gray-200/80 pt-4 dark:border-neutral-700">
      <h3 className="exam-prep-panel-round-title">미달성</h3>
      <p className="exam-prep-panel-subtitle mb-2">
        미완료 또는 기한이 지난 미실행 항목입니다.
      </p>
      <ul className="space-y-2">
        {items.map((entry) => (
          <li
            key={`${entry.roundSlot}-${entry.weekNumber}-${entry.subjectId}-${entry.item.id}`}
            className={`rounded-md border border-amber-200/80 bg-amber-50/70 px-2 py-2 text-sm dark:border-amber-900/60 dark:bg-amber-950/20 ${subjectClassName(entry.subjectId, subjects)}`}
            style={buildSubjectPanelStyle(entry.subjectId, subjects)}
          >
            <p className="font-medium text-gray-900 dark:text-gray-100">{entry.item.title}</p>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              {getSubjectLabel(entry.subjectId, subjects)} ·{' '}
              {formatOccurrenceDateLabel(entry.occurrenceDate)} ·{' '}
              {formatUnachievedReasonLabel(entry.reason)}
            </p>
            {onCarryOverItem || onDeleteUnachievedItem ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {onCarryOverItem ? (
                  <button
                    type="button"
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-neutral-600"
                    onClick={() => onCarryOverItem(entry)}
                  >
                    다른 주로
                  </button>
                ) : null}
                {onDeleteUnachievedItem ? (
                  <button
                    type="button"
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 dark:border-red-900/60 dark:text-red-300"
                    onClick={() => onDeleteUnachievedItem(entry)}
                  >
                    계획에서 삭제
                  </button>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PanelContent({
  sections,
  subjects,
  placementItemId,
  onItemClick,
}: {
  sections: VisibleWeeklyPlanSection[];
  subjects: ExamPrepWeeklyPlansContext['subjects'];
  placementItemId?: string | null;
  onItemClick?: (placement: WeeklyPlanPlacementContext) => void;
}) {
  return (
    <div className="exam-prep-panel-sections">
      {sections.map((section) => (
        <section key={`${section.kind}-${section.sectionKey}`} className="exam-prep-panel-round">
          {sections.length > 1 || section.weeks.length > 0 ? (
            <h3 className="exam-prep-panel-round-title">{section.sectionLabel}</h3>
          ) : null}

          {section.weeks.map((week) => (
            <div
              key={`${section.sectionKey}-${week.weekNumber}`}
              className="exam-prep-panel-week"
            >
              <div className="exam-prep-panel-week-header">
                {week.showWeekLabel && week.weekLabel ? (
                  <p className="exam-prep-panel-week-title">{week.weekLabel}</p>
                ) : null}
                <p
                  className={
                    week.showWeekLabel
                      ? 'exam-prep-panel-week-range'
                      : 'exam-prep-panel-week-title'
                  }
                >
                  {formatWeekRange(week.weekStart, week.weekEnd)}
                </p>
              </div>

              <ul className="exam-prep-panel-subject-list">
                {week.subjects.map((subject) => (
                  <li
                    key={subject.subjectId}
                    className={`exam-prep-panel-subject ${subjectClassName(subject.subjectId, subjects)}`}
                    style={buildSubjectPanelStyle(subject.subjectId, subjects)}
                  >
                    <p className="exam-prep-panel-subject-label">
                      {getSubjectLabel(subject.subjectId, subjects)}
                    </p>
                    {subject.items && subject.items.length > 0 ? (
                      <ul className="exam-prep-panel-item-list mt-1 space-y-1">
                        {subject.items.map((item) => (
                          <li
                            key={item.id}
                            className={`exam-prep-panel-item rounded-md border border-gray-200/80 bg-white/60 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-zinc-900/40 ${
                              onItemClick
                                ? 'cursor-pointer hover:bg-white/90 dark:hover:bg-zinc-900/70'
                                : 'cursor-grab active:cursor-grabbing'
                            } ${
                              placementItemId === item.id
                                ? 'ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-zinc-900'
                                : ''
                            }`}
                            data-weekly-plan-item-id={item.id}
                            data-weekly-plan-item-title={item.title}
                            data-weekly-plan-subject-id={subject.subjectId}
                            data-weekly-plan-week-number={week.weekNumber}
                            data-weekly-plan-round-slot={
                              section.kind === 'exam' ? section.sectionKey : undefined
                            }
                            data-weekly-plan-period-slot={
                              section.kind === 'vacation' ? section.sectionKey : undefined
                            }
                            data-weekly-plan-regular-period-key={
                              section.kind === 'regular' ? section.sectionKey : undefined
                            }
                            data-weekly-plan-week-start={week.weekStart}
                            data-weekly-plan-week-end={week.weekEnd}
                            onClick={(event) => {
                              if (!onItemClick) {
                                return;
                              }

                              const placement = readWeeklyPlanPlacementFromElement(
                                event.currentTarget
                              );
                              if (placement) {
                                onItemClick(placement);
                              }
                            }}
                          >
                            {item.title}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="exam-prep-panel-subject-content">{subject.content}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export default function WeeklyPlanPanel({
  range,
  examContext,
  vacationContext,
  regularContext,
  sections: sectionsOverride,
  loading = false,
  className = '',
  collapsible = false,
  defaultCollapsed = false,
  placementItemId = null,
  onItemClick,
  unachievedItems = [],
  onCarryOverItem,
  onDeleteUnachievedItem,
}: WeeklyPlanPanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const resolvedSections = useMemo(() => {
    if (sectionsOverride) {
      return sectionsOverride;
    }

    if (!range) {
      return [];
    }

    return resolveVisibleWeeklyPlanSections(
      range,
      examContext,
      vacationContext,
      regularContext
    );
  }, [examContext, range, regularContext, sectionsOverride, vacationContext]);

  const periodFlags = useMemo(() => {
    if (!range) {
      return { inExamPeriod: false, inVacationPeriod: false, inRegularPeriod: false };
    }

    return {
      inExamPeriod: isVisibleRangeInAnyExamPrepWeekPlanPeriod(range, examContext),
      inVacationPeriod: isVisibleRangeInAnyVacationPeriod(
        range,
        vacationContext.vacationPeriodPreview
      ),
      inRegularPeriod: isVisibleRangeInAnyRegularPeriod(
        range,
        regularContext.regularPeriodPreview
      ),
    };
  }, [examContext, range, regularContext, vacationContext]);

  const inExamPeriod = periodFlags.inExamPeriod;
  const inVacationPeriod = periodFlags.inVacationPeriod;
  const inRegularPeriod = periodFlags.inRegularPeriod;

  const panelBody = loading ? (
    <p className="exam-prep-panel-loading">공부 계획을 불러오는 중...</p>
  ) : resolvedSections.length === 0 && unachievedItems.length === 0 ? (
    <PanelEmptyState
      inExamPeriod={inExamPeriod}
      inVacationPeriod={inVacationPeriod}
      inRegularPeriod={inRegularPeriod}
    />
  ) : (
    <>
      {resolvedSections.length > 0 ? (
        <PanelContent
          sections={resolvedSections}
          subjects={examContext.subjects}
          placementItemId={placementItemId}
          onItemClick={onItemClick}
        />
      ) : null}
      <UnachievedSection
        items={unachievedItems}
        subjects={examContext.subjects}
        onCarryOverItem={onCarryOverItem}
        onDeleteUnachievedItem={onDeleteUnachievedItem}
      />
    </>
  );

  const headerLabel = '주간 공부계획';

  return (
    <aside className={`exam-prep-panel ${className}`.trim()}>
      {collapsible ? (
        <button
          type="button"
          className="exam-prep-panel-toggle"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          <span className="exam-prep-panel-title">{headerLabel}</span>
          <span className="exam-prep-panel-toggle-hint">{collapsed ? '펼치기' : '접기'}</span>
        </button>
      ) : (
        <div className="exam-prep-panel-header">
          <h2 className="exam-prep-panel-title">{headerLabel}</h2>
          <p className="exam-prep-panel-subtitle">현재 보이는 주간에 해당하는 공부 계획</p>
        </div>
      )}

      {(!collapsible || !collapsed) && (
        <div className="exam-prep-panel-body">{panelBody}</div>
      )}
    </aside>
  );
}
