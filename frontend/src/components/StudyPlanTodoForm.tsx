'use client';

import { crossesMidnight, validateScheduleTimeRange } from '@/lib/schedule-time';
import {
  formatOccurrenceDateLabel,
  isAllWeekdaysSelected,
  toggleAllWeekdays,
  toggleWeekday,
  WEEKDAY_OPTIONS,
  type RecurrenceType,
} from '@/lib/user-schedule';
import {
  buildSubjectSelectOptions,
  resolveOccurrenceFields,
  type PlanSubjectKey,
  type StudyPlanTodo,
  type StudyPlanTodoInput,
} from '@/lib/study-plan-todo';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useProfileSubjectsContext } from '@/contexts/ProfileSubjectsContext';
import { useStudentApi } from '@/hooks/useStudentApi';
import StudyPlanTitleCombobox from '@/components/StudyPlanTitleCombobox';
import StudyPlanTitlePresetChips from '@/components/StudyPlanTitlePresetChips';
import ResponsiveOverlay from '@/components/ResponsiveOverlay';
import {
  composeStudyPlanTitle,
  createEmptyStudyPlanTitleParts,
  type StudyPlanTitleParts,
} from '@/lib/study-plan-title-builder';
import { findUserSubject } from '@/lib/user-subject';

export type StudyPlanTodoFormMode = 'create' | 'once' | 'series' | 'occurrence';

export interface StudyPlanTodoFormInitial {
  subject?: PlanSubjectKey;
  title?: string;
  startTime?: string;
  endTime?: string;
  recurrenceType?: RecurrenceType;
  daysOfWeek?: number[];
  validFrom?: string;
  validUntil?: string;
  date?: string;
}

interface StudyPlanTodoFormProps {
  open: boolean;
  mode: StudyPlanTodoFormMode;
  todo?: StudyPlanTodo | null;
  occurrenceDate?: string;
  initial?: StudyPlanTodoFormInitial;
  onClose: () => void;
  onSaved: () => void;
}

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeInput(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function buildDefaults(
  mode: StudyPlanTodoFormMode,
  todo?: StudyPlanTodo | null,
  initial?: StudyPlanTodoFormInitial,
  occurrenceDate?: string,
  defaultSubject: PlanSubjectKey = 'math'
) {
  const today = todayIsoDate();

  if (mode === 'occurrence' && todo && occurrenceDate) {
    const fields = resolveOccurrenceFields(todo, occurrenceDate);
    return {
      subject: todo.subject,
      title: fields.title,
      startTime: fields.startTime,
      endTime: fields.endTime,
      recurrenceType: 'once' as RecurrenceType,
      daysOfWeek: todo.daysOfWeek,
      validFrom: todo.validFrom ?? today,
      validUntil: todo.validUntil ?? today,
      date: occurrenceDate,
    };
  }

  return {
    subject: todo?.subject ?? initial?.subject ?? defaultSubject,
    title: todo?.title ?? initial?.title ?? '',
    startTime: todo?.startTime ?? initial?.startTime ?? '16:00',
    endTime: todo?.endTime ?? initial?.endTime ?? '18:00',
    recurrenceType:
      mode === 'series'
        ? ('weekly' as RecurrenceType)
        : (todo?.recurrenceType ?? initial?.recurrenceType ?? ('once' as RecurrenceType)),
    daysOfWeek: todo?.daysOfWeek ?? initial?.daysOfWeek ?? [1],
    validFrom: todo?.validFrom ?? initial?.validFrom ?? today,
    validUntil:
      todo?.validUntil ?? initial?.validUntil ?? (mode === 'create' ? '' : today),
    date: todo?.date ?? initial?.date ?? today,
  };
}

export function buildInitialFromSelection(start: Date, end: Date): StudyPlanTodoFormInitial {
  // FullCalendar may end on the next calendar day; HH:mm with end < start means next-day end.
  return {
    recurrenceType: 'once',
    date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    startTime: formatTimeInput(start),
    endTime: formatTimeInput(end),
    daysOfWeek: [start.getDay()],
  };
}

function formTitle(mode: StudyPlanTodoFormMode): string {
  if (mode === 'create') {
    return '스터디 플랜 추가';
  }

  return '스터디 플랜 수정';
}

export default function StudyPlanTodoForm({
  open,
  mode,
  todo,
  occurrenceDate,
  initial,
  onClose,
  onSaved,
}: StudyPlanTodoFormProps) {
  const { withStudent } = useStudentApi();
  const { subjectOptions, subjects: profileSubjects, loading: subjectsLoading } =
    useProfileSubjectsContext();
  const isEdit = mode !== 'create';
  const isOccurrence = mode === 'occurrence';
  const allCheckboxRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState<PlanSubjectKey>('math');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('18:00');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('once');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]);
  const [validFrom, setValidFrom] = useState(todayIsoDate());
  const [validUntil, setValidUntil] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [titleParts, setTitleParts] = useState<StudyPlanTitleParts>(
    createEmptyStudyPlanTitleParts()
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const previousSubjectRef = useRef<PlanSubjectKey | null>(null);

  const showWeeklyFields =
    mode === 'series' || (mode === 'create' && recurrenceType === 'weekly');
  const showSingleDate =
    mode === 'once' ||
    mode === 'occurrence' ||
    (mode === 'create' && recurrenceType === 'once');

  const allSelected = isAllWeekdaysSelected(daysOfWeek);
  const someSelected = daysOfWeek.length > 0 && !allSelected;
  const titleSubject = isOccurrence && todo ? todo.subject : subject;

  const selectSubjectOptions = useMemo(
    () => buildSubjectSelectOptions(subjectOptions, subject, profileSubjects),
    [subjectOptions, subject, profileSubjects]
  );

  const defaultSubject = subjectOptions[0]?.value ?? ('math' as PlanSubjectKey);

  const currentSubjectMeta = useMemo(
    () => findUserSubject(titleSubject, profileSubjects),
    [titleSubject, profileSubjects]
  );

  const subjectTextbooks = currentSubjectMeta?.textbooks ?? [];
  const subjectStudyMethods = currentSubjectMeta?.studyMethods ?? [];
  const showTitlePresets = mode === 'create';

  function applyTitleParts(
    updater: StudyPlanTitleParts | ((prev: StudyPlanTitleParts) => StudyPlanTitleParts)
  ) {
    setTitleParts((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setTitle(composeStudyPlanTitle(next));
      return next;
    });
  }

  function handleSelectTextbook(selectedTextbook: string | null) {
    applyTitleParts((prev) => ({
      ...prev,
      selectedTextbook,
    }));
  }

  function handleSelectStudyMethod(selectedStudyMethod: string | null) {
    applyTitleParts((prev) => ({
      ...prev,
      selectedStudyMethod,
    }));
  }

  function handleRangeChange(rangeSuffix: string) {
    applyTitleParts((prev) => ({
      ...prev,
      rangeSuffix,
    }));
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const defaults = buildDefaults(
      mode,
      todo,
      initial,
      occurrenceDate,
      defaultSubject
    );
    setSubject(defaults.subject);
    setTitle(defaults.title);
    setStartTime(defaults.startTime);
    setEndTime(defaults.endTime);
    setRecurrenceType(defaults.recurrenceType);
    setDaysOfWeek(defaults.daysOfWeek);
    setValidFrom(defaults.validFrom);
    setValidUntil(defaults.validUntil);
    setDate(defaults.date);
    setTitleParts(createEmptyStudyPlanTitleParts());
    setError('');
    previousSubjectRef.current = defaults.subject;
  }, [open, mode, todo, initial, occurrenceDate, defaultSubject]);

  useEffect(() => {
    if (!open || mode !== 'create') {
      return;
    }

    if (previousSubjectRef.current !== null && previousSubjectRef.current !== subject) {
      setTitleParts(createEmptyStudyPlanTitleParts());
      setTitle('');
    }

    previousSubjectRef.current = subject;
  }, [open, mode, subject]);

  useEffect(() => {
    if (!open) {
      previousSubjectRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open || subjectsLoading || mode === 'occurrence') {
      return;
    }

    if (!selectSubjectOptions.some((option) => option.value === subject)) {
      setSubject(selectSubjectOptions[0]?.value ?? defaultSubject);
    }
  }, [open, subjectsLoading, mode, selectSubjectOptions, subject, defaultSubject]);

  useEffect(() => {
    if (allCheckboxRef.current) {
      allCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  if (!open) {
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (mode === 'create' && recurrenceType === 'weekly' && daysOfWeek.length === 0) {
      setError('요일을 하나 이상 선택해 주세요.');
      return;
    }

    if (mode === 'series' && daysOfWeek.length === 0) {
      setError('요일을 하나 이상 선택해 주세요.');
      return;
    }

    if (
      (mode === 'series' || (mode === 'create' && recurrenceType === 'weekly')) &&
      !validUntil.trim()
    ) {
      setError('종료일을 입력해 주세요.');
      return;
    }

    const timeError = validateScheduleTimeRange(startTime, endTime);
    if (timeError) {
      setError(timeError);
      return;
    }

    setLoading(true);

    try {
      if (mode === 'occurrence') {
        if (!todo || !occurrenceDate) {
          setError('스터디 플랜 정보가 없습니다.');
          return;
        }

        const res = await fetch(
          withStudent(`/api/study-plan-todos/${todo.id}/occurrences/${occurrenceDate}`),
          {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, startTime, endTime }),
          }
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? '스터디 플랜 저장에 실패했습니다.');
          return;
        }
      } else {
        const payload: StudyPlanTodoInput = {
          subject,
          title,
          startTime,
          endTime,
          recurrenceType: mode === 'series' ? 'weekly' : recurrenceType,
        };

        if (mode === 'series' || (mode === 'create' && recurrenceType === 'weekly')) {
          payload.daysOfWeek = daysOfWeek;
          payload.validFrom = validFrom;
          payload.validUntil = validUntil;
        } else {
          payload.date = date;
        }

        const res = await fetch(
          withStudent(
            isEdit ? `/api/study-plan-todos/${todo!.id}` : '/api/study-plan-todos'
          ),
          {
            method: isEdit ? 'PUT' : 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? '스터디 플랜 저장에 실패했습니다.');
          return;
        }
      }

      onSaved();
      onClose();
    } catch {
      setError('스터디 플랜 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!todo) {
      return;
    }

    if (isOccurrence && occurrenceDate) {
      if (!confirm(`${formatOccurrenceDateLabel(occurrenceDate)} 스터디 플랜만 삭제할까요?`)) {
        return;
      }
    } else if (!confirm('이 스터디 플랜을 삭제할까요?')) {
      return;
    }

    setError('');
    setDeleting(true);

    try {
      const res = await fetch(
        withStudent(
          isOccurrence && occurrenceDate
            ? `/api/study-plan-todos/${todo.id}/occurrences/${occurrenceDate}`
            : `/api/study-plan-todos/${todo.id}`
        ),
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '스터디 플랜 삭제에 실패했습니다.');
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError('스터디 플랜 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ResponsiveOverlay open={open} onClose={onClose} title={formTitle(mode)} mobileVariant="sheet">
      <form className="space-y-4" onSubmit={handleSubmit}>
          {!isOccurrence && (
            <label className="block space-y-1">
              <span className="text-sm text-gray-600 dark:text-gray-300">과목</span>
              <select
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value as PlanSubjectKey)}
                disabled={subjectsLoading}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-neutral-600 dark:bg-zinc-800"
              >
                {selectSubjectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {subjectsLoading && (
                <p className="text-xs text-gray-400">과목 목록 불러오는 중...</p>
              )}
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">제목</span>
            <StudyPlanTitleCombobox
              value={title}
              onChange={setTitle}
              subject={titleSubject}
              withStudent={withStudent}
              required
            />
          </label>

          {showTitlePresets && (
            <StudyPlanTitlePresetChips
              textbooks={subjectTextbooks}
              studyMethods={subjectStudyMethods}
              selectedTextbook={titleParts.selectedTextbook}
              selectedStudyMethod={titleParts.selectedStudyMethod}
              rangeSuffix={titleParts.rangeSuffix}
              onSelectTextbook={handleSelectTextbook}
              onSelectStudyMethod={handleSelectStudyMethod}
              onRangeChange={handleRangeChange}
              disabled={loading || deleting}
            />
          )}

          {mode === 'create' && (
            <fieldset className="space-y-2">
              <legend className="text-sm text-gray-600 dark:text-gray-300">반복</legend>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="recurrenceType"
                    checked={recurrenceType === 'once'}
                    onChange={() => setRecurrenceType('once')}
                  />
                  1회
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="recurrenceType"
                    checked={recurrenceType === 'weekly'}
                    onChange={() => {
                      setRecurrenceType('weekly');
                      setValidUntil('');
                      if (daysOfWeek.length === 0) {
                        setDaysOfWeek([new Date(date).getDay()]);
                      }
                    }}
                  />
                  매주
                </label>
              </div>
            </fieldset>
          )}

          {showSingleDate && (
            <label className="block space-y-1">
              <span className="text-sm text-gray-600 dark:text-gray-300">날짜</span>
              <input
                type="date"
                required
                readOnly={isOccurrence}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800 read-only:cursor-default read-only:bg-gray-50 dark:read-only:bg-zinc-800/80"
              />
            </label>
          )}

          {showWeeklyFields && (
            <>
              <fieldset className="space-y-2">
                <legend className="text-sm text-gray-600 dark:text-gray-300">요일</legend>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600">
                    <input
                      ref={allCheckboxRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => setDaysOfWeek(toggleAllWeekdays(e.target.checked))}
                    />
                    전체
                  </label>
                  {WEEKDAY_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600"
                    >
                      <input
                        type="checkbox"
                        checked={daysOfWeek.includes(option.value)}
                        onChange={(e) =>
                          setDaysOfWeek(
                            toggleWeekday(daysOfWeek, option.value, e.target.checked)
                          )
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-sm text-gray-600 dark:text-gray-300">시작일</span>
                  <input
                    type="date"
                    required
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm text-gray-600 dark:text-gray-300">종료일</span>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
                  />
                </label>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm text-gray-600 dark:text-gray-300">시작 시간</span>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                종료 시간
                {crossesMidnight(startTime, endTime) && (
                  <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
                    (다음날)
                  </span>
                )}
              </span>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
              />
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading || deleting}
                className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading || deleting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-neutral-600"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading || deleting}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </form>
    </ResponsiveOverlay>
  );
}
