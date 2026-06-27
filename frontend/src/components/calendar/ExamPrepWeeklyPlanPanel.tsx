'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatPrepWeekLabel } from '@/lib/exam-countdown';
import { subjectClassName } from '@/lib/calendar-design-tokens';
import { buildSubjectPanelStyle } from '@/lib/subject-color';
import type { ExamPrepWeeklyPlansContext } from '@/lib/exam-prep-weekly-plans-context';
import {
  resolveVisiblePrepWeekPlans,
  type VisibleDateRange,
  type VisiblePrepWeekPlanRound,
} from '@/lib/exam-prep-visible-week-plans';
import { getSubjectLabel } from '@/lib/user-subject';
import { weeklyPlanItemsToMultilineText } from '@/lib/weekly-plan-item';

const EXAM_PREP_WEEKLY_PLAN_SETTINGS_HREF = '/dashboard/preferences/exam-prep-weekly-plan';

function formatYmdDisplay(ymd: string): string {
  return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}

function formatPrepWeekRange(weekStart: string, weekEnd: string): string {
  if (weekStart === weekEnd) {
    return formatYmdDisplay(weekStart);
  }

  return `${formatYmdDisplay(weekStart)} ~ ${formatYmdDisplay(weekEnd)}`;
}

export interface ExamPrepWeeklyPlanPanelProps {
  range: VisibleDateRange | null;
  context: ExamPrepWeeklyPlansContext;
  rounds?: VisiblePrepWeekPlanRound[];
  loading?: boolean;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

function PanelEmptyState() {
  return (
    <div className="exam-prep-panel-empty">
      <p>이번 주에 표시할 시험 준비 계획이 없습니다.</p>
      <p>
        <Link href={EXAM_PREP_WEEKLY_PLAN_SETTINGS_HREF} className="exam-prep-panel-empty-link">
          시험기간 주차별 공부계획 설정
        </Link>
        에서 입력할 수 있습니다.
      </p>
    </div>
  );
}

function PanelContent({
  rounds,
  subjects,
}: {
  rounds: VisiblePrepWeekPlanRound[];
  subjects: ExamPrepWeeklyPlansContext['subjects'];
}) {
  return (
    <div className="exam-prep-panel-sections">
      {rounds.map((round) => (
        <section key={round.roundSlot} className="exam-prep-panel-round">
          {rounds.length > 1 ? (
            <h3 className="exam-prep-panel-round-title">{round.roundLabel}</h3>
          ) : null}

          {round.weeks.map((week) => (
            <div key={`${round.roundSlot}-${week.weekNumber}`} className="exam-prep-panel-week">
              <div className="exam-prep-panel-week-header">
                <p className="exam-prep-panel-week-title">{formatPrepWeekLabel(week.weekNumber)}</p>
                <p className="exam-prep-panel-week-range">
                  {formatPrepWeekRange(week.weekStart, week.weekEnd)}
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
                    <p className="exam-prep-panel-subject-content">
                      {weeklyPlanItemsToMultilineText(subject.items) || '-'}
                    </p>
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

export default function ExamPrepWeeklyPlanPanel({
  range,
  context,
  rounds: roundsOverride,
  loading = false,
  className = '',
  collapsible = false,
  defaultCollapsed = false,
}: ExamPrepWeeklyPlanPanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const resolvedRounds = useMemo(() => {
    if (roundsOverride) {
      return roundsOverride;
    }

    if (!range) {
      return [];
    }

    return resolveVisiblePrepWeekPlans(range, context);
  }, [context, range, roundsOverride]);

  const panelBody = loading ? (
    <p className="exam-prep-panel-loading">시험 준비 계획을 불러오는 중...</p>
  ) : resolvedRounds.length === 0 ? (
    <PanelEmptyState />
  ) : (
    <PanelContent rounds={resolvedRounds} subjects={context.subjects} />
  );

  const headerLabel = '시험 준비 계획';

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
          <p className="exam-prep-panel-subtitle">현재 보이는 주간에 해당하는 D-N 주차 계획</p>
        </div>
      )}

      {(!collapsible || !collapsed) && (
        <div className="exam-prep-panel-body">{panelBody}</div>
      )}
    </aside>
  );
}
