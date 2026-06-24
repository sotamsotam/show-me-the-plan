'use client';

import {
  ALL_DAY_END_TIME,
  ALL_DAY_START_TIME,
  crossesMidnight,
  validateScheduleTimeRange,
} from '@/lib/schedule-time';
import { isAllDayCalendarSelection, inclusiveEndFromAllDaySelection } from '@/lib/calendar-event-range';
import {
  formatOccurrenceDateLabel,
  isAllWeekdaysSelected,
  resolveOccurrenceFields,
  SCHEDULE_CATEGORY_OPTIONS,
  SCHEDULE_CATEGORY_OPTIONS_FOR_CREATE,
  toggleAllWeekdays,
  toggleWeekday,
  WEEKDAY_OPTIONS,
  type RecurrenceType,
  type ScheduleAttachment,
  type ScheduleCategory,
  type UserSchedule,
  type UserScheduleInput,
} from '@/lib/user-schedule';
import { uploadScheduleAttachmentFile } from '@/lib/schedule-attachment';
import ScheduleAttachmentField, {
  createPendingScheduleAttachment,
  type PendingScheduleAttachment,
} from '@/components/ScheduleAttachmentField';
import { FormEvent, useEffect, useRef, useState } from 'react';
import ResponsiveOverlay from '@/components/ResponsiveOverlay';
import { useStudentApi } from '@/hooks/useStudentApi';

export type UserScheduleFormMode = 'create' | 'once' | 'series' | 'occurrence';

export type UserScheduleFormVariant = 'default' | 'monthAllDay';

export interface UserScheduleFormInitial {
  title?: string;
  scheduleCategory?: ScheduleCategory;
  allDay?: boolean;
  monthAllDay?: boolean;
  startTime?: string;
  endTime?: string;
  recurrenceType?: RecurrenceType;
  daysOfWeek?: number[];
  validFrom?: string;
  validUntil?: string;
  date?: string;
  endDate?: string;
}

interface UserScheduleFormProps {
  open: boolean;
  mode: UserScheduleFormMode;
  variant?: UserScheduleFormVariant;
  schedule?: UserSchedule | null;
  occurrenceDate?: string;
  initial?: UserScheduleFormInitial;
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
  mode: UserScheduleFormMode,
  schedule?: UserSchedule | null,
  initial?: UserScheduleFormInitial,
  occurrenceDate?: string
) {
  const today = todayIsoDate();

  if (mode === 'occurrence' && schedule && occurrenceDate) {
    const fields = resolveOccurrenceFields(schedule, occurrenceDate);
    return {
      title: fields.title,
      scheduleCategory: schedule.scheduleCategory,
      allDay: schedule.allDay,
      startTime: fields.startTime,
      endTime: fields.endTime,
      recurrenceType: 'once' as RecurrenceType,
      daysOfWeek: schedule.daysOfWeek,
      validFrom: schedule.validFrom ?? today,
      validUntil: schedule.validUntil ?? today,
      date: occurrenceDate,
      endDate: occurrenceDate,
    };
  }

  return {
    title: schedule?.title ?? initial?.title ?? '',
    scheduleCategory:
      schedule?.scheduleCategory ??
      initial?.scheduleCategory ??
      (mode === 'create' ? 'academy' : 'managed'),
    allDay: schedule?.allDay ?? initial?.allDay ?? false,
    startTime:
      schedule?.startTime ??
      initial?.startTime ??
      (initial?.allDay ? ALL_DAY_START_TIME : '16:00'),
    endTime:
      schedule?.endTime ??
      initial?.endTime ??
      (initial?.allDay ? ALL_DAY_END_TIME : '18:00'),
    recurrenceType:
      mode === 'series'
        ? ('weekly' as RecurrenceType)
        : (schedule?.recurrenceType ?? initial?.recurrenceType ?? ('once' as RecurrenceType)),
    daysOfWeek: schedule?.daysOfWeek ?? initial?.daysOfWeek ?? [1],
    validFrom: schedule?.validFrom ?? initial?.validFrom ?? today,
    validUntil:
      schedule?.validUntil ?? initial?.validUntil ?? (mode === 'create' ? '' : today),
    date: schedule?.date ?? initial?.date ?? today,
    endDate:
      schedule?.endDate ??
      initial?.endDate ??
      schedule?.date ??
      initial?.date ??
      today,
  };
}

export function buildInitialFromSelection(start: Date, end: Date): UserScheduleFormInitial {
  const date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

  if (isAllDayCalendarSelection(start, end)) {
    return {
      recurrenceType: 'once',
      date,
      endDate: inclusiveEndFromAllDaySelection(start, end),
      allDay: true,
      monthAllDay: true,
      startTime: ALL_DAY_START_TIME,
      endTime: ALL_DAY_END_TIME,
      scheduleCategory: 'other',
    };
  }

  // FullCalendar may end on the next calendar day; HH:mm with end < start means next-day end.
  return {
    recurrenceType: 'once',
    date,
    startTime: formatTimeInput(start),
    endTime: formatTimeInput(end),
    daysOfWeek: [start.getDay()],
  };
}

export function buildInitialFromUserEvent(
  schedule: UserSchedule,
  occurrenceDate: string,
  start: Date,
  end: Date | null
): UserScheduleFormInitial | undefined {
  if (schedule.allDay) {
    return {
      date: schedule.date ?? occurrenceDate,
      endDate: schedule.endDate ?? schedule.date ?? occurrenceDate,
      allDay: true,
      monthAllDay: true,
      startTime: ALL_DAY_START_TIME,
      endTime: ALL_DAY_END_TIME,
    };
  }

  if (!end) {
    return undefined;
  }

  return buildInitialFromSelection(start, end);
}

function formTitle(mode: UserScheduleFormMode): string {
  if (mode === 'create') {
    return '일정 추가';
  }

  return '일정 수정';
}

export default function UserScheduleForm({
  open,
  mode,
  variant = 'default',
  schedule,
  occurrenceDate,
  initial,
  onClose,
  onSaved,
}: UserScheduleFormProps) {
  const { withStudent } = useStudentApi();
  const isMonthAllDay = variant === 'monthAllDay';
  const isEdit = mode !== 'create';
  const isOccurrence = mode === 'occurrence';
  const allCheckboxRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [scheduleCategory, setScheduleCategory] = useState<ScheduleCategory>('academy');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('18:00');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('once');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]);
  const [validFrom, setValidFrom] = useState(todayIsoDate());
  const [validUntil, setValidUntil] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [endDate, setEndDate] = useState(todayIsoDate());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attachments, setAttachments] = useState<ScheduleAttachment[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<PendingScheduleAttachment[]>([]);
  const pendingAttachmentsRef = useRef(pendingAttachments);
  pendingAttachmentsRef.current = pendingAttachments;

  const showWeeklyFields =
    !isMonthAllDay &&
    (mode === 'series' || (mode === 'create' && recurrenceType === 'weekly'));
  const showSingleDate =
    !isMonthAllDay &&
    (mode === 'once' ||
      mode === 'occurrence' ||
      (mode === 'create' && recurrenceType === 'once'));
  const showDateRange = isMonthAllDay && (mode === 'create' || mode === 'once');

  const allSelected = isAllWeekdaysSelected(daysOfWeek);
  const someSelected = daysOfWeek.length > 0 && !allSelected;

  useEffect(() => {
    if (!open) {
      return;
    }

    const defaults = buildDefaults(mode, schedule, initial, occurrenceDate);
    setTitle(defaults.title);
    setScheduleCategory(defaults.scheduleCategory);
    setStartTime(defaults.startTime);
    setEndTime(defaults.endTime);
    setRecurrenceType(defaults.recurrenceType);
    setDaysOfWeek(defaults.daysOfWeek);
    setValidFrom(defaults.validFrom);
    setValidUntil(defaults.validUntil);
    setDate(defaults.date);
    setEndDate(defaults.endDate ?? defaults.date);
    setAttachments(schedule?.attachments ?? []);
    setPendingAttachments((current) => {
      for (const pending of current) {
        if (pending.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(pending.previewUrl);
        }
      }

      return [];
    });
    setError('');
  }, [open, mode, schedule, initial, occurrenceDate]);

  useEffect(() => {
    return () => {
      for (const pending of pendingAttachmentsRef.current) {
        if (pending.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(pending.previewUrl);
        }
      }
    };
  }, []);

  function handleAddAttachmentFile(file: File) {
    setPendingAttachments((current) => [...current, createPendingScheduleAttachment(file)]);
  }

  function handleRemoveAttachment(attachmentId: number) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  }

  function handleRemovePendingAttachment(key: string) {
    setPendingAttachments((current) => {
      const target = current.find((pending) => pending.key === key);
      if (target?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((pending) => pending.key !== key);
    });
  }

  async function resolveAttachmentIdsForSave(): Promise<number[] | undefined> {
    if (!isMonthAllDay) {
      return undefined;
    }

    const uploadedIds: number[] = [];

    for (const pending of pendingAttachments) {
      const uploaded = await uploadScheduleAttachmentFile(pending.file, withStudent);
      uploadedIds.push(uploaded.id);
    }

    return [...attachments.map((attachment) => attachment.id), ...uploadedIds];
  }

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

    if (isMonthAllDay && endDate < date) {
      setError('종료일은 시작일보다 같거나 늦어야 합니다.');
      return;
    }

    if (!isMonthAllDay && schedule?.allDay) {
      setError('종일 일정은 월간 일정표에서만 수정할 수 있습니다.');
      return;
    }

    const timeError = isMonthAllDay ? null : validateScheduleTimeRange(startTime, endTime);
    if (timeError) {
      setError(timeError);
      return;
    }

    const resolvedStartTime = isMonthAllDay ? ALL_DAY_START_TIME : startTime;
    const resolvedEndTime = isMonthAllDay ? ALL_DAY_END_TIME : endTime;
    const resolvedCategory: ScheduleCategory = isMonthAllDay ? 'other' : scheduleCategory;
    const resolvedAllDay = isMonthAllDay;

    setLoading(true);

    try {
      const attachmentIds = await resolveAttachmentIdsForSave();

      if (mode === 'occurrence') {
        if (!schedule || !occurrenceDate) {
          setError('일정 정보가 없습니다.');
          return;
        }

        const occurrenceBody = schedule.allDay
          ? { title }
          : { title, startTime: resolvedStartTime, endTime: resolvedEndTime };

        const res = await fetch(
          withStudent(`/api/user-schedules/${schedule.id}/occurrences/${occurrenceDate}`),
          {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(occurrenceBody),
          }
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? '일정 저장에 실패했습니다.');
          return;
        }
      } else {
        const payload: UserScheduleInput = {
          title,
          scheduleCategory: resolvedCategory,
          allDay: resolvedAllDay,
          startTime: resolvedStartTime,
          endTime: resolvedEndTime,
          recurrenceType: mode === 'series' ? 'weekly' : isMonthAllDay ? 'once' : recurrenceType,
        };

        if (mode === 'series' || (mode === 'create' && recurrenceType === 'weekly')) {
          payload.daysOfWeek = daysOfWeek;
          payload.validFrom = validFrom;
          payload.validUntil = validUntil;
        } else {
          payload.date = date;
          if (isMonthAllDay) {
            payload.endDate = endDate;
            payload.attachmentIds = attachmentIds;
          }
        }

        const res = await fetch(
          withStudent(
            isEdit ? `/api/user-schedules/${schedule!.id}` : '/api/user-schedules'
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
          setError(data.error ?? '일정 저장에 실패했습니다.');
          return;
        }
      }

      onSaved();
      onClose();
    } catch {
      setError('일정 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!schedule) {
      return;
    }

    if (isOccurrence && occurrenceDate) {
      if (!confirm(`${formatOccurrenceDateLabel(occurrenceDate)} 일정만 삭제할까요?`)) {
        return;
      }
    } else if (!confirm('이 일정을 삭제할까요?')) {
      return;
    }

    setError('');
    setDeleting(true);

    try {
      const res = await fetch(
        withStudent(
          isOccurrence && occurrenceDate
            ? `/api/user-schedules/${schedule.id}/occurrences/${occurrenceDate}`
            : `/api/user-schedules/${schedule.id}`
        ),
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '일정 삭제에 실패했습니다.');
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError('일정 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ResponsiveOverlay open={open} onClose={onClose} title={formTitle(mode)} mobileVariant="sheet">
      <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">제목</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 수행평가 일정, 가족 여행 등"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
            />
          </label>

          {!isOccurrence && !isMonthAllDay && (
            <label className="block space-y-1">
              <span className="text-sm text-gray-600 dark:text-gray-300">일정 구분</span>
              <select
                required
                value={scheduleCategory}
                onChange={(e) => setScheduleCategory(e.target.value as ScheduleCategory)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
              >
                {(mode === 'create'
                  ? SCHEDULE_CATEGORY_OPTIONS_FOR_CREATE
                  : SCHEDULE_CATEGORY_OPTIONS
                ).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {mode === 'create' && !isMonthAllDay && (
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

          {showDateRange && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-sm text-gray-600 dark:text-gray-300">시작일</span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setDate(nextDate);
                    if (endDate < nextDate) {
                      setEndDate(nextDate);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-600 dark:text-gray-300">종료일</span>
                <input
                  type="date"
                  required
                  value={endDate}
                  min={date}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
                />
              </label>
            </div>
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

          {isMonthAllDay ? (
            <ScheduleAttachmentField
              attachments={attachments}
              pendingAttachments={pendingAttachments}
              onAddFile={handleAddAttachmentFile}
              onRemoveAttachment={handleRemoveAttachment}
              onRemovePending={handleRemovePendingAttachment}
              disabled={loading || deleting}
            />
          ) : null}

          {!isMonthAllDay && (
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
          )}

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
