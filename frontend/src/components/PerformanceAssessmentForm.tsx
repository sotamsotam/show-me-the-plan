'use client';

import ResponsiveOverlay from '@/components/ResponsiveOverlay';
import ScheduleAttachmentField, {
  createPendingScheduleAttachment,
  type PendingScheduleAttachment,
} from '@/components/ScheduleAttachmentField';
import { useStudentApi } from '@/hooks/useStudentApi';
import { useProfileSubjects } from '@/hooks/useProfileSubjects';
import { resolveNeisTimetableSubject } from '@/lib/neis-timetable-subject';
import {
  buildPerformanceAssessmentTitle,
  type UserSchedule,
} from '@/lib/user-schedule';
import { uploadScheduleAttachmentFile } from '@/lib/schedule-attachment';
import { ALL_DAY_END_TIME, ALL_DAY_START_TIME } from '@/lib/schedule-time';
import type { TimetableEntry } from '@/lib/timetable';
import { getTodayIsoDate, shiftIsoDate } from '@/lib/user-schedule';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface TimetableSubjectOption {
  key: string;
  period: number | null;
  subjectLabel: string;
  neisSubject: string;
}

interface PerformanceAssessmentFormProps {
  open: boolean;
  schedule?: UserSchedule | null;
  onClose: () => void;
  onSaved: () => void;
}

function buildSubjectOptions(
  entries: TimetableEntry[],
  date: string,
  subjects: Parameters<typeof resolveNeisTimetableSubject>[1]
): TimetableSubjectOption[] {
  const ymd = date.replace(/-/g, '');
  const dayEntries = entries.filter((entry) => entry.date === ymd);

  return dayEntries
    .map((entry) => {
      const resolved = resolveNeisTimetableSubject(entry.subject, subjects);
      return {
        key: `${entry.period}-${entry.subject}`,
        period: entry.period,
        subjectLabel: resolved.displayLabel,
        neisSubject: resolved.neisLabel,
      };
    })
    .sort((a, b) => (a.period ?? 0) - (b.period ?? 0));
}

export default function PerformanceAssessmentForm({
  open,
  schedule,
  onClose,
  onSaved,
}: PerformanceAssessmentFormProps) {
  const { withStudent, studentUserId } = useStudentApi();
  const { subjects } = useProfileSubjects({ studentUserId });
  const isEdit = Boolean(schedule);
  const [date, setDate] = useState(getTodayIsoDate());
  const [selectedKey, setSelectedKey] = useState('');
  const [manualSubject, setManualSubject] = useState('');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attachments, setAttachments] = useState<
    NonNullable<UserSchedule['attachments']>
  >([]);
  const [pendingAttachments, setPendingAttachments] = useState<PendingScheduleAttachment[]>(
    []
  );
  const pendingAttachmentsRef = useRef(pendingAttachments);
  pendingAttachmentsRef.current = pendingAttachments;

  const subjectOptions = useMemo(
    () => buildSubjectOptions(timetableEntries, date, subjects),
    [timetableEntries, date, subjects]
  );

  const profileSubjectFallback = useMemo(
    () =>
      subjects.map((subject) => ({
        key: `profile-${subject.id}`,
        period: null as number | null,
        subjectLabel: subject.label,
        neisSubject: subject.label,
      })),
    [subjects]
  );

  const hasTimetableSubjects = subjectOptions.length > 0;
  const selectableOptions = hasTimetableSubjects ? subjectOptions : profileSubjectFallback;
  const selectedOption = selectableOptions.find((option) => option.key === selectedKey);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDate(schedule?.date ?? getTodayIsoDate());
    setTitle(schedule?.title ?? '');
    setTitleTouched(Boolean(schedule));
    setAttachments(schedule?.attachments ?? []);
    setManualSubject(schedule?.linkedSubject ?? '');
    setError('');
    setPendingAttachments((current) => {
      for (const pending of current) {
        if (pending.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(pending.previewUrl);
        }
      }
      return [];
    });

    if (schedule?.linkedPeriod != null) {
      setSelectedKey(`period-${schedule.linkedPeriod}`);
    } else if (schedule?.linkedSubject) {
      setSelectedKey(`manual:${schedule.linkedSubject}`);
      setManualSubject(schedule.linkedSubject);
    } else {
      setSelectedKey('');
    }
  }, [open, schedule]);

  useEffect(() => {
    return () => {
      for (const pending of pendingAttachmentsRef.current) {
        if (pending.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(pending.previewUrl);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!open || !date) {
      return;
    }

    let cancelled = false;

    async function loadTimetable() {
      setTimetableLoading(true);
      try {
        const params = new URLSearchParams({
          start: date,
          end: shiftIsoDate(date, 1),
        });
        const res = await fetch(withStudent(`/api/timetable?${params}`), {
          credentials: 'include',
        });
        const data = (await res.json()) as {
          entries?: TimetableEntry[];
          error?: string;
        };

        if (!res.ok) {
          if (!cancelled) {
            setTimetableEntries([]);
            setError(data.error ?? '시간표를 불러오지 못했습니다.');
          }
          return;
        }

        if (!cancelled) {
          setTimetableEntries(data.entries ?? []);
          setError('');
        }
      } catch {
        if (!cancelled) {
          setTimetableEntries([]);
          setError('시간표를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setTimetableLoading(false);
        }
      }
    }

    void loadTimetable();

    return () => {
      cancelled = true;
    };
  }, [open, date, withStudent]);

  useEffect(() => {
    if (!open || schedule?.linkedPeriod == null || subjectOptions.length === 0) {
      return;
    }

    const matched = subjectOptions.find((option) => option.period === schedule.linkedPeriod);
    if (matched) {
      setSelectedKey(matched.key);
    }
  }, [open, schedule, subjectOptions]);

  useEffect(() => {
    if (!open || titleTouched) {
      return;
    }

    const subjectLabel = selectedOption?.subjectLabel ?? manualSubject.trim();
    if (subjectLabel) {
      setTitle(buildPerformanceAssessmentTitle(subjectLabel));
    }
  }, [open, titleTouched, selectedOption, manualSubject]);

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

  async function uploadPendingAttachments(): Promise<number[]> {
    const uploadedIds: number[] = [];

    for (const pending of pendingAttachments) {
      const uploaded = await uploadScheduleAttachmentFile(pending.file, withStudent);
      uploadedIds.push(uploaded.id);
    }

    return uploadedIds;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const linkedSubject =
        selectedOption?.subjectLabel.trim() || manualSubject.trim() || '';

      if (!linkedSubject) {
        setError('과목을 선택하거나 입력해 주세요.');
        setLoading(false);
        return;
      }

      const linkedPeriod = selectedOption?.period ?? null;
      const uploadedIds = await uploadPendingAttachments();
      const attachmentIds = [
        ...attachments.map((attachment) => attachment.id),
        ...uploadedIds,
      ];

      const payload = {
        title: title.trim() || buildPerformanceAssessmentTitle(linkedSubject),
        scheduleCategory: 'performance' as const,
        startTime: ALL_DAY_START_TIME,
        endTime: ALL_DAY_END_TIME,
        allDay: true,
        recurrenceType: 'once' as const,
        date,
        endDate: null,
        linkedSubject,
        linkedPeriod,
        attachmentIds,
      };

      const res = await fetch(
        withStudent(isEdit ? `/api/user-schedules/${schedule!.id}` : '/api/user-schedules'),
        {
          method: isEdit ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? '수행평가 저장에 실패했습니다.');
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError('수행평가 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!schedule) {
      return;
    }

    if (!window.confirm('이 수행평가 일정을 삭제할까요?')) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const res = await fetch(withStudent(`/api/user-schedules/${schedule.id}`), {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? '삭제에 실패했습니다.');
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError('삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ResponsiveOverlay
      open={open}
      onClose={onClose}
      title={isEdit ? '수행평가 수정' : '수행평가 추가'}
      mobileVariant="sheet"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-1">
          <span className="text-sm text-gray-600 dark:text-gray-300">날짜</span>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSelectedKey('');
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-gray-600 dark:text-gray-300">과목</span>
          {timetableLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              학교시간표를 불러오는 중...
            </p>
          ) : hasTimetableSubjects ? (
            <select
              required
              value={selectedKey}
              onChange={(e) => {
                setSelectedKey(e.target.value);
                setTitleTouched(false);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
            >
              <option value="">교시·과목 선택</option>
              {subjectOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.period}교시 {option.subjectLabel}
                </option>
              ))}
            </select>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                선택한 날짜의 학교시간표가 없습니다. 과목을 직접 선택하거나 입력해 주세요.
              </p>
              {profileSubjectFallback.length > 0 ? (
                <select
                  value={selectedKey.startsWith('profile-') ? selectedKey : ''}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSelectedKey(next);
                    const option = profileSubjectFallback.find((item) => item.key === next);
                    if (option) {
                      setManualSubject(option.subjectLabel);
                      setTitleTouched(false);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
                >
                  <option value="">프로필 과목 선택</option>
                  {profileSubjectFallback.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.subjectLabel}
                    </option>
                  ))}
                </select>
              ) : null}
              <input
                type="text"
                value={manualSubject}
                onChange={(e) => {
                  setManualSubject(e.target.value);
                  setSelectedKey('');
                  setTitleTouched(false);
                }}
                placeholder="과목명 입력"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
              />
            </div>
          )}
        </label>

        {(selectedOption || manualSubject.trim()) && (
          <>
            <label className="block space-y-1">
              <span className="text-sm text-gray-600 dark:text-gray-300">제목</span>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleTouched(true);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
              />
            </label>

            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">수행평가서 사진</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">최대 5장</span>
              </div>
              <ScheduleAttachmentField
                attachments={attachments}
                pendingAttachments={pendingAttachments}
                onAddFile={handleAddAttachmentFile}
                onRemoveAttachment={handleRemoveAttachment}
                onRemovePending={handleRemovePendingAttachment}
                disabled={loading || deleting}
                hideHeader
              />
            </div>
          </>
        )}

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          {isEdit ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={loading || deleting}
              className="mr-auto rounded-lg px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          ) : null}
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
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </ResponsiveOverlay>
  );
}
