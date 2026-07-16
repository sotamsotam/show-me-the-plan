'use client';

import MobileFab from '@/components/MobileFab';
import PerformanceAssessmentForm from '@/components/PerformanceAssessmentForm';
import ScheduleAttachmentViewer from '@/components/ScheduleAttachmentViewer';
import { useProfileSubjectsContext } from '@/contexts/ProfileSubjectsContext';
import { useStudentApi } from '@/hooks/useStudentApi';
import { useUserSchedulesInRange } from '@/hooks/useUserSchedulesInRange';
import { invalidateUserSchedules } from '@/lib/dashboard-data-invalidation';
import { filterPerformanceAssessments } from '@/lib/performance-assessment';
import { buildSubjectAccentBarStyle } from '@/lib/subject-color';
import {
  formatOccurrenceDateLabel,
  getMonthRange,
  getTodayIsoDate,
  type UserSchedule,
} from '@/lib/user-schedule';
import {
  resolveProfileSubjects,
  resolveSubjectCategory,
  type LegacyStudyPlanSubject,
  type PlanSubjectKey,
  type ProfileSubjectsInput,
} from '@/lib/user-subject';
import { useMemo, useState } from 'react';

const SUBJECT_ACCENT_COLORS: Record<LegacyStudyPlanSubject, string> = {
  korean: 'bg-red-500',
  english: 'bg-blue-500',
  math: 'bg-violet-500',
  social: 'bg-amber-500',
  science: 'bg-cyan-500',
  ethics: 'bg-pink-500',
  tech_home: 'bg-lime-500',
  info: 'bg-sky-500',
  history: 'bg-yellow-600',
  chinese: 'bg-rose-600',
  other: 'bg-gray-500',
};

function resolvePerformanceSubjectKey(
  linkedSubject: string | null | undefined,
  subjects?: ProfileSubjectsInput
): PlanSubjectKey {
  const label = linkedSubject?.trim() ?? '';
  if (!label) {
    return 'other';
  }

  const matched = resolveProfileSubjects(subjects).find(
    (subject) => subject.label.trim() === label
  );

  return matched?.id ?? 'other';
}

function formatPerformanceDdayLabel(targetDate: string, today: string): string {
  const from = new Date(`${today}T12:00:00`);
  const to = new Date(`${targetDate}T12:00:00`);
  const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000);

  if (diff === 0) {
    return 'D-Day';
  }

  if (diff > 0) {
    return `D-${diff}`;
  }

  return `D+${Math.abs(diff)}`;
}

function getPerformanceDdayDaysRemaining(targetDate: string, today: string): number {
  const from = new Date(`${today}T12:00:00`);
  const to = new Date(`${targetDate}T12:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function performanceDdayColorClass(daysRemaining: number): string {
  // 3일 이내(당일 포함): 빨강, 그 이상: 초록
  return daysRemaining <= 3
    ? 'text-red-600 dark:text-red-400'
    : 'text-green-600 dark:text-green-400';
}

function PerformanceAssessmentRow({
  item,
  subjects,
  today,
  onEdit,
}: {
  item: UserSchedule;
  subjects?: ProfileSubjectsInput;
  today: string;
  onEdit: (schedule: UserSchedule) => void;
}) {
  const subjectKey = resolvePerformanceSubjectKey(item.linkedSubject, subjects);
  const subjectCategory = resolveSubjectCategory(subjectKey, subjects);
  const customAccentStyle = buildSubjectAccentBarStyle(subjectKey, subjects);
  const subjectLabel = item.linkedSubject?.trim() || '과목 미지정';
  const daysRemaining = item.date
    ? getPerformanceDdayDaysRemaining(item.date, today)
    : null;
  const ddayLabel = item.date ? formatPerformanceDdayLabel(item.date, today) : null;
  const attachmentEvent = {
    id: `performance-${item.id}`,
    title: item.title,
    extendedProps: {
      attachments: item.attachments ?? [],
    },
  };

  return (
    <li>
      <button
        type="button"
        onClick={() => onEdit(item)}
        className="touch-press flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-50 md:p-3 dark:hover:bg-zinc-800/80 dark:active:bg-zinc-800/60"
      >
        <span
          className={`h-10 w-1 shrink-0 rounded-full ${
            customAccentStyle ? '' : SUBJECT_ACCENT_COLORS[subjectCategory]
          }`}
          style={customAccentStyle}
          aria-hidden
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-zinc-800 dark:text-gray-200">
              {subjectLabel}
            </span>
            <p className="min-w-0 text-[15px] font-semibold leading-snug text-gray-900 dark:text-gray-100">
              {item.title}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {item.date ? formatOccurrenceDateLabel(item.date) : ''}
            {item.linkedPeriod != null ? ` · ${item.linkedPeriod}교시` : ''}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {ddayLabel && daysRemaining != null ? (
            <p
              className={`text-base font-bold ${performanceDdayColorClass(daysRemaining)}`}
            >
              {ddayLabel}
            </p>
          ) : null}
          {(item.attachments?.length ?? 0) > 0 ? (
            <span
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <ScheduleAttachmentViewer
                event={attachmentEvent}
                title={item.title}
                variant="badge"
              />
            </span>
          ) : null}
        </div>
      </button>
    </li>
  );
}

export default function PerformanceAssessmentPage() {
  const { studentUserId } = useStudentApi();
  const { subjects: profileSubjects } = useProfileSubjectsContext();
  const today = getTodayIsoDate();
  const range = useMemo(() => {
    const current = getMonthRange(today);
    const nextMonthAnchor = `${current.end.slice(0, 8)}01`;
    const next = getMonthRange(nextMonthAnchor);
    return { start: current.start, end: next.end };
  }, [today]);

  const { schedules, isLoading, error, refetch } = useUserSchedulesInRange({
    start: range.start,
    end: range.end,
    scheduleCategory: 'performance',
  });

  const assessments = useMemo(
    () =>
      filterPerformanceAssessments(schedules)
        .filter((item) => {
          if (!item.date) {
            return false;
          }
          // 오늘 이전 일정은 목록에서 숨김
          if (item.date < today) {
            return false;
          }
          return item.date >= range.start && item.date < range.end;
        })
        .sort((a, b) => {
          const dateCompare = (a.date ?? '').localeCompare(b.date ?? '');
          if (dateCompare !== 0) {
            return dateCompare;
          }

          const periodA = a.linkedPeriod ?? Number.POSITIVE_INFINITY;
          const periodB = b.linkedPeriod ?? Number.POSITIVE_INFINITY;
          return periodA - periodB;
        }),
    [schedules, range.end, range.start, today]
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserSchedule | null>(null);

  async function handleSaved() {
    invalidateUserSchedules(studentUserId);
    // 캐시 무효화 알림으로 하단 네비 등도 갱신. force 없이 in-flight 공유.
    await refetch(false);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(schedule: UserSchedule) {
    setEditing(schedule);
    setFormOpen(true);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <p className="text-sm text-white">
        날짜와 과목을 선택해 수행평가서 안내서를 사진으로 저장하세요. 일정에 등록되고 내용을 확인할 수 있어요.
      </p>

      {error ? <p className="text-sm text-red-200">{error}</p> : null}

      <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            불러오는 중...
          </p>
        ) : assessments.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            등록된 수행평가 일정이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-neutral-800">
            {assessments.map((item) => (
              <PerformanceAssessmentRow
                key={item.id}
                item={item}
                subjects={profileSubjects}
                today={today}
                onEdit={openEdit}
              />
            ))}
          </ul>
        )}

        <div className="hidden border-t border-gray-200 px-4 py-3 dark:border-neutral-800 md:block md:px-4">
          <button
            type="button"
            onClick={openCreate}
            className="touch-press w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-500"
          >
            수행평가 추가
          </button>
        </div>
      </div>

      <PerformanceAssessmentForm
        open={formOpen}
        schedule={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => void handleSaved()}
      />

      <MobileFab label="수행평가 추가" onClick={openCreate} />
    </div>
  );
}
