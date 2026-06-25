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

function PanelContent({
  sections,
  subjects,
}: {
  sections: VisibleWeeklyPlanSection[];
  subjects: ExamPrepWeeklyPlansContext['subjects'];
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
                    <p className="exam-prep-panel-subject-content">{subject.content}</p>
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
  ) : resolvedSections.length === 0 ? (
    <PanelEmptyState
      inExamPeriod={inExamPeriod}
      inVacationPeriod={inVacationPeriod}
      inRegularPeriod={inRegularPeriod}
    />
  ) : (
    <PanelContent sections={resolvedSections} subjects={examContext.subjects} />
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
