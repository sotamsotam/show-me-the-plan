'use client';

import { crossesMidnight, validateScheduleTimeRange } from '@/lib/schedule-time';
import {
  EXECUTION_STATUS_OPTIONS,
  formatStudyPlanEventTitle,
  type ExecutionInputMode,
  type ExecutionRecordInput,
  type ExecutionStatus,
  type ExpandedStudyPlanTodoEvent,
  type StudyPlanExecutionRecord,
  type StudyPlanTodo,
} from '@/lib/study-plan-todo';
import { formatOccurrenceDateLabel } from '@/lib/user-schedule';
import { useCallback, useEffect, useRef, useState } from 'react';
import ResponsiveOverlay from '@/components/ResponsiveOverlay';
import WeeklyPlanCarryOverModal from '@/components/calendar/WeeklyPlanCarryOverModal';
import { triggerHaptic } from '@/lib/haptic';
import { useStudentApi } from '@/hooks/useStudentApi';
import type { ExamPrepWeeksByRound } from '@/lib/exam-countdown';
import { getWeeksForSlot } from '@/lib/exam-countdown';
import {
  buildCarryOverPayload,
  requestCarryOverExamPrepWeeklyPlanItem,
  requestDeleteExamPrepWeeklyPlanItem,
} from '@/lib/exam-prep-weekly-plan-item-actions';
import { resolveDefaultCarryOverWeek } from '@/lib/exam-prep-weekly-plan-unachieved';

interface StudyPlanTodoExecutionModalProps {
  open: boolean;
  todo: ExpandedStudyPlanTodoEvent | null;
  studyPlanTodo?: StudyPlanTodo | null;
  examPrepWeeksByRound?: ExamPrepWeeksByRound;
  existingRecord?: StudyPlanExecutionRecord;
  onClose: () => void;
  onSaved: () => void;
  onWeeklyPlanChanged?: () => void;
}

function formatTimeInput(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function getElapsedParts(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function getPlannedDurationMinutes(startIso: string, endIso: string): number {
  const start = parseTimeToMinutes(extractPlannedTime(startIso));
  let end = parseTimeToMinutes(extractPlannedTime(endIso));
  if (end <= start) {
    end += 24 * 60;
  }
  return end - start;
}

function formatDurationLabel(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder > 0 ? `${hours}시간 ${remainder}분` : `${hours}시간`;
  }
  return `${minutes}분`;
}

function formatElapsedDurationLabel(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
  }
  if (totalMinutes > 0) {
    return `${totalMinutes}분`;
  }
  return `${Math.floor(ms / 1000)}초`;
}

function TimerPlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-7 w-7" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function TimerStopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function TimerDigit({
  value,
  emphasize = false,
}: {
  value: number;
  emphasize?: boolean;
}) {
  return (
    <span
      className={`inline-block min-w-[3.1rem] text-center font-mono text-[2.35rem] font-semibold leading-none tracking-tight tabular-nums sm:min-w-[3.6rem] sm:text-[2.75rem] ${
        emphasize ? 'text-emerald-300' : 'text-white'
      }`}
    >
      {String(value).padStart(2, '0')}
    </span>
  );
}

function TimerColon({ pulsing }: { pulsing: boolean }) {
  return (
    <span
      className={`select-none font-mono text-2xl font-light text-white/40 ${
        pulsing ? 'animate-pulse' : ''
      }`}
      aria-hidden
    >
      :
    </span>
  );
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatMinutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function addMsToTime(startTime: string, ms: number): string {
  const addedMinutes = Math.ceil(ms / 60000);
  return formatMinutesToTime(parseTimeToMinutes(startTime) + addedMinutes);
}

function extractPlannedTime(iso: string): string {
  return iso.slice(11, 16);
}

function formatPlannedTimeRange(start: string, end: string): string {
  return `${extractPlannedTime(start)}~${extractPlannedTime(end)}`;
}

function buildDefaults(
  todo: ExpandedStudyPlanTodoEvent,
  record?: StudyPlanExecutionRecord
) {
  const status = (record?.status ?? 'completed') as ExecutionStatus;

  return {
    inputMode: (record?.inputMode ?? 'timer') as ExecutionInputMode,
    executedStartTime:
      record?.executedStartTime ?? extractPlannedTime(todo.start),
    executedEndTime: record?.executedEndTime ?? extractPlannedTime(todo.end),
    status,
    achievementLevel:
      record?.achievementLevel ?? (status === 'incomplete' ? null : 5),
  };
}

export default function StudyPlanTodoExecutionModal({
  open,
  todo,
  studyPlanTodo = null,
  examPrepWeeksByRound,
  existingRecord,
  onClose,
  onSaved,
  onWeeklyPlanChanged,
}: StudyPlanTodoExecutionModalProps) {
  const { withStudent } = useStudentApi();
  const [inputMode, setInputMode] = useState<ExecutionInputMode>('timer');
  const [executedStartTime, setExecutedStartTime] = useState('');
  const [executedEndTime, setExecutedEndTime] = useState('');
  const [status, setStatus] = useState<ExecutionStatus>('completed');
  const [achievementLevel, setAchievementLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showIncompleteActions, setShowIncompleteActions] = useState(false);
  const [carryOverOpen, setCarryOverOpen] = useState(false);
  const [carryOverWeek, setCarryOverWeek] = useState(1);
  const [carryOverLoading, setCarryOverLoading] = useState(false);
  const [carryOverError, setCarryOverError] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerStartRef = useRef<Date | null>(null);
  const accumulatedMsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    timerStartRef.current = null;
    setTimerRunning(false);
  }, []);

  const getCurrentElapsedMs = useCallback(() => {
    if (timerRunning && timerStartRef.current) {
      return accumulatedMsRef.current + Date.now() - timerStartRef.current.getTime();
    }
    return accumulatedMsRef.current;
  }, [timerRunning]);

  const resetTimer = useCallback(() => {
    stopInterval();
    accumulatedMsRef.current = 0;
    setElapsedMs(0);
  }, [stopInterval]);

  useEffect(() => {
    if (!open || !todo) {
      return;
    }

    const defaults = buildDefaults(todo, existingRecord);
    setInputMode(defaults.inputMode);
    setExecutedStartTime(defaults.executedStartTime);
    setExecutedEndTime(defaults.executedEndTime);
    setStatus(defaults.status);
    setAchievementLevel(defaults.achievementLevel);
    setError('');
    setEditingTitle(false);
    setEditedTitle(todo.title);
    setShowIncompleteActions(false);
    setCarryOverOpen(false);
    setCarryOverError('');
    resetTimer();
  }, [open, todo, existingRecord, resetTimer]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  function handleClose() {
    if (timerRunning) {
      if (!confirm('타이머가 실행 중입니다. 닫으면 기록이 저장되지 않습니다. 닫을까요?')) {
        return;
      }
      stopInterval();
    }

    onClose();
  }

  function handleInputModeChange(mode: ExecutionInputMode) {
    if (mode === inputMode) {
      return;
    }

    if (timerRunning || accumulatedMsRef.current > 0) {
      const message = timerRunning
        ? '타이머가 실행 중입니다. 입력 방식을 변경하면 타이머가 초기화됩니다. 계속할까요?'
        : '입력 방식을 변경하면 타이머 기록이 초기화됩니다. 계속할까요?';

      if (!confirm(message)) {
        return;
      }
    }

    resetTimer();
    setInputMode(mode);
    setError('');
  }

  function handleStartTimer() {
    const now = new Date();
    timerStartRef.current = now;

    if (accumulatedMsRef.current === 0) {
      setExecutedStartTime(formatTimeInput(now));
    }

    setTimerRunning(true);
    setInputMode('timer');
    setElapsedMs(accumulatedMsRef.current);
    triggerHaptic('light');

    intervalRef.current = setInterval(() => {
      if (timerStartRef.current) {
        setElapsedMs(
          accumulatedMsRef.current + Date.now() - timerStartRef.current.getTime()
        );
      }
    }, 1000);
  }

  function handleStopTimer() {
    if (!timerStartRef.current) {
      return;
    }

    accumulatedMsRef.current += Date.now() - timerStartRef.current.getTime();
    setElapsedMs(accumulatedMsRef.current);
    stopInterval();
    triggerHaptic('medium');
  }

  function handleStatusChange(nextStatus: ExecutionStatus) {
    setStatus(nextStatus);

    if (nextStatus === 'incomplete') {
      setAchievementLevel(null);
    } else if (achievementLevel == null) {
      setAchievementLevel(5);
    }
  }

  function handleEditTitleClick() {
    setEditingTitle(true);
    setError('');
  }

  async function saveExecution(updateTitle: boolean) {
    if (!todo) {
      return;
    }

    setError('');

    if (updateTitle && !editedTitle.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }

    let saveStartTime = executedStartTime;
    let saveEndTime = executedEndTime;

    if (status !== 'incomplete') {
      if (inputMode === 'timer') {
        const totalMs = getCurrentElapsedMs();

        if (totalMs < 1000) {
          setError('타이머를 시작하여 학습 시간을 측정해 주세요.');
          return;
        }

        if (!saveStartTime) {
          setError('타이머를 시작해 주세요.');
          return;
        }

        saveEndTime = addMsToTime(saveStartTime, totalMs);
      } else if (!saveStartTime || !saveEndTime) {
        setError('시행 시작·종료 시간을 입력해 주세요.');
        return;
      }

      const executionTimeError = validateScheduleTimeRange(
        saveStartTime,
        saveEndTime,
        { startLabel: '시작 시간', endLabel: '종료 시간' }
      );
      if (executionTimeError) {
        setError(executionTimeError);
        return;
      }

      if (achievementLevel == null || achievementLevel < 1 || achievementLevel > 10) {
        setError('성취도를 1~10 중에서 선택해 주세요.');
        return;
      }
    }

    const payload: ExecutionRecordInput =
      status === 'incomplete'
        ? { status: 'incomplete' }
        : {
            status,
            executedStartTime: saveStartTime,
            executedEndTime: saveEndTime,
            inputMode,
            achievementLevel: achievementLevel!,
          };

    setLoading(true);

    try {
      if (updateTitle) {
        const titlePayload =
          todo.recurrenceType === 'weekly'
            ? {
                url: withStudent(
                  `/api/study-plan-todos/${todo.todoId}/occurrences/${todo.date}`
                ),
                body: {
                  title: editedTitle.trim(),
                  startTime: extractPlannedTime(todo.start),
                  endTime: extractPlannedTime(todo.end),
                },
              }
            : {
                url: withStudent(`/api/study-plan-todos/${todo.todoId}`),
                body: { title: editedTitle.trim() },
              };

        const titleRes = await fetch(titlePayload.url, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(titlePayload.body),
        });
        const titleData = await titleRes.json();

        if (!titleRes.ok) {
          setError(titleData.error ?? '제목 저장에 실패했습니다.');
          return;
        }
      }

      const res = await fetch(
        withStudent(`/api/study-plan-todos/${todo.todoId}/executions/${todo.date}`),
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '실행 기록 저장에 실패했습니다.');
        return;
      }

      const weeklyPlanSource = studyPlanTodo?.weeklyPlanSource;
      if (
        status === 'incomplete' &&
        weeklyPlanSource?.kind === 'exam-prep' &&
        examPrepWeeksByRound
      ) {
        const defaultWeek = resolveDefaultCarryOverWeek(
          weeklyPlanSource.weekNumber,
          examPrepWeeksByRound,
          weeklyPlanSource.roundSlot
        );
        setCarryOverWeek(defaultWeek ?? weeklyPlanSource.weekNumber + 1);
        setShowIncompleteActions(true);
        triggerHaptic('success');
        return;
      }

      onSaved();
      onClose();
      triggerHaptic('success');
    } catch {
      setError(updateTitle ? '저장에 실패했습니다.' : '실행 기록 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  if (!open || !todo) {
    return null;
  }

  const weeklyPlanSource = studyPlanTodo?.weeklyPlanSource;
  const carryOverWeekOptions =
    weeklyPlanSource?.kind === 'exam-prep' && examPrepWeeksByRound
      ? Array.from(
          { length: getWeeksForSlot(weeklyPlanSource.roundSlot, examPrepWeeksByRound) },
          (_, index) => index + 1
        ).filter((week) => week !== weeklyPlanSource.weekNumber)
      : [];

  async function handleConfirmWeeklyPlanCarryOver() {
    if (!weeklyPlanSource || weeklyPlanSource.kind !== 'exam-prep') {
      return;
    }

    setCarryOverLoading(true);
    setCarryOverError('');

    const result = await requestCarryOverExamPrepWeeklyPlanItem(
      withStudent,
      buildCarryOverPayload(
        weeklyPlanSource.roundSlot,
        weeklyPlanSource.weekNumber,
        weeklyPlanSource.subjectId,
        weeklyPlanSource.itemId,
        carryOverWeek
      )
    );

    setCarryOverLoading(false);

    if (!result.ok) {
      setCarryOverError(result.error ?? '공부 계획 이월에 실패했습니다.');
      return;
    }

    onWeeklyPlanChanged?.();
    onSaved();
    onClose();
  }

  async function handleDeleteWeeklyPlanItem() {
    if (!weeklyPlanSource || weeklyPlanSource.kind !== 'exam-prep') {
      return;
    }

    if (
      !confirm(
        '이 공부 계획 항목을 주차별 계획에서 삭제할까요? 연결된 캘린더 일정도 함께 삭제됩니다.'
      )
    ) {
      return;
    }

    setLoading(true);
    setError('');

    const result = await requestDeleteExamPrepWeeklyPlanItem(withStudent, {
      roundSlot: weeklyPlanSource.roundSlot,
      weekNumber: weeklyPlanSource.weekNumber,
      subjectId: weeklyPlanSource.subjectId,
      itemId: weeklyPlanSource.itemId,
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? '공부 계획 항목 삭제에 실패했습니다.');
      return;
    }

    onWeeklyPlanChanged?.();
    onSaved();
    onClose();
  }

  function handleDismissIncompleteActions() {
    onSaved();
    onClose();
  }

  const showTimeInputs = status !== 'incomplete';
  const showAchievement = status === 'completed' || status === 'partial';
  const elapsedParts = getElapsedParts(elapsedMs);
  const timerStatus = timerRunning ? 'running' : elapsedMs > 0 ? 'paused' : 'idle';
  const plannedDurationMinutes = getPlannedDurationMinutes(todo.start, todo.end);
  const plannedMs = Math.max(plannedDurationMinutes, 0) * 60_000;
  const timerProgress =
    plannedMs > 0 ? Math.min(1, elapsedMs / plannedMs) : timerRunning || elapsedMs > 0 ? 1 : 0;
  const timerStatusLabel =
    timerStatus === 'running' ? '측정 중' : timerStatus === 'paused' ? '일시정지' : '대기';
  const timerStatusDotClass =
    timerStatus === 'running'
      ? 'bg-emerald-400'
      : timerStatus === 'paused'
        ? 'bg-amber-400'
        : 'bg-white/35';
  const timerProgressClass =
    timerStatus === 'running'
      ? 'bg-emerald-400'
      : timerStatus === 'paused'
        ? 'bg-amber-300'
        : 'bg-white/35';

  return (
    <>
    <ResponsiveOverlay open={open} onClose={handleClose} mobileVariant="fullscreen">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-zinc-800">
          {editingTitle ? (
            <label className="block space-y-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">제목</span>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold dark:border-neutral-600 dark:bg-zinc-800 dark:text-gray-100"
                autoFocus
              />
            </label>
          ) : (
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatStudyPlanEventTitle(todo.subject, todo.title)}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formatOccurrenceDateLabel(todo.date)} · 계획{' '}
            {formatPlannedTimeRange(todo.start, todo.end)}
          </p>
        </div>

        <div className="mt-4 space-y-4">
          {showTimeInputs && (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleInputModeChange('direct')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    inputMode === 'direct'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-300'
                      : 'border-gray-300 text-gray-600 dark:border-neutral-600 dark:text-gray-300'
                  }`}
                >
                  직접입력
                </button>
                <button
                  type="button"
                  onClick={() => handleInputModeChange('timer')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    inputMode === 'timer'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-300'
                      : 'border-gray-300 text-gray-600 dark:border-neutral-600 dark:text-gray-300'
                  }`}
                >
                  타이머입력
                </button>
              </div>

              {inputMode === 'direct' ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      시행 시작
                    </span>
                    <input
                      type="time"
                      value={executedStartTime}
                      onChange={(e) => setExecutedStartTime(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      시행 종료
                      {crossesMidnight(executedStartTime, executedEndTime) && (
                        <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
                          (다음날)
                        </span>
                      )}
                    </span>
                    <input
                      type="time"
                      value={executedEndTime}
                      onChange={(e) => setExecutedEndTime(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
                    />
                  </label>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[#092254]/12 bg-[#f4f6fa] dark:border-white/10 dark:bg-zinc-950">
                  <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
                    <div className="inline-flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${timerStatusDotClass} ${
                          timerRunning ? 'animate-pulse' : ''
                        }`}
                      />
                      <span className="text-xs font-semibold tracking-wide text-[#092254] dark:text-gray-200">
                        {timerStatusLabel}
                      </span>
                    </div>
                    <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-[#092254]/80 shadow-sm dark:bg-white/10 dark:text-gray-300">
                      계획 {formatDurationLabel(plannedDurationMinutes)}
                    </span>
                  </div>

                  <div className="relative mx-3 mt-3 overflow-hidden rounded-xl bg-[#092254] px-2 py-6 dark:bg-[#071428]">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-40"
                      style={{
                        background:
                          'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.12), transparent 55%)',
                      }}
                      aria-hidden
                    />
                    <div className="relative flex items-center justify-center gap-1 sm:gap-2">
                      <TimerDigit value={elapsedParts.hours} />
                      <TimerColon pulsing={timerRunning} />
                      <TimerDigit value={elapsedParts.minutes} />
                      <TimerColon pulsing={timerRunning} />
                      <TimerDigit
                        value={elapsedParts.seconds}
                        emphasize={timerRunning}
                      />
                    </div>
                    <div className="relative mx-auto mt-5 h-1 max-w-[13rem] overflow-hidden rounded-full bg-white/15">
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ease-out ${timerProgressClass}`}
                        style={{ width: `${Math.round(timerProgress * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3 px-4 py-4">
                    <button
                      type="button"
                      onClick={timerRunning ? handleStopTimer : handleStartTimer}
                      className={`flex h-16 w-16 items-center justify-center rounded-full text-white transition-transform hover:scale-[1.03] active:scale-95 ${
                        timerRunning
                          ? 'bg-rose-600 shadow-[0_10px_24px_-10px_rgba(225,29,72,0.85)]'
                          : 'bg-[#092254] shadow-[0_10px_24px_-10px_rgba(9,34,84,0.7)] dark:bg-emerald-600 dark:shadow-[0_10px_24px_-10px_rgba(5,150,105,0.7)]'
                      }`}
                      aria-label={
                        timerRunning ? '중지' : elapsedMs > 0 ? '재개' : '시작'
                      }
                    >
                      {timerRunning ? <TimerStopIcon /> : <TimerPlayIcon />}
                    </button>

                    {(timerRunning || elapsedMs > 0) && (
                      <p className="text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        경과 {formatElapsedDurationLabel(elapsedMs)}
                        {executedStartTime && (
                          <>
                            {' '}
                            · {executedStartTime}
                            {timerRunning
                              ? ' ~ 진행 중'
                              : ` ~ ${addMsToTime(executedStartTime, elapsedMs)}`}
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">실행 상태</p>
            <div className="flex gap-2">
              {EXECUTION_STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleStatusChange(option.value)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors sm:text-sm ${
                    status === option.value
                      ? option.value === 'completed'
                        ? 'border-green-500 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-950 dark:text-green-300'
                        : option.value === 'partial'
                          ? 'border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-300'
                          : 'border-gray-500 bg-gray-100 text-gray-700 dark:border-gray-400 dark:bg-zinc-800 dark:text-gray-300'
                      : 'border-gray-300 text-gray-600 dark:border-neutral-600 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {showAchievement && achievementLevel != null && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-300">성취도</p>
                <span className="text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                  {achievementLevel}/10
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={achievementLevel}
                onChange={(e) => setAchievementLevel(Number(e.target.value))}
                className="h-2 w-full cursor-pointer rounded-full accent-blue-600 dark:accent-blue-400"
                aria-label="성취도"
                aria-valuemin={1}
                aria-valuemax={10}
                aria-valuenow={achievementLevel}
              />
              <div className="mt-1 flex justify-between px-0.5 text-xs tabular-nums text-gray-400 dark:text-gray-500">
                <span>1</span>
                <span>10</span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {showIncompleteActions ? (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                미완료로 저장되었습니다. 다음 중 선택해 주세요.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600"
                  onClick={() => setCarryOverOpen(true)}
                >
                  다음 주로 미루기
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:text-red-300"
                  onClick={() => {
                    void handleDeleteWeeklyPlanItem();
                  }}
                >
                  계획에서 삭제
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900"
                  onClick={handleDismissIncompleteActions}
                >
                  나중에
                </button>
              </div>
            </div>
          ) : (
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-neutral-600"
            >
              취소
            </button>
            {!editingTitle && (
              <button
                type="button"
                onClick={handleEditTitleClick}
                disabled={loading}
                className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
              >
                제목수정 후 저장
              </button>
            )}
            <button
              type="button"
              onClick={() => saveExecution(editingTitle)}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
          )}
        </div>
    </ResponsiveOverlay>

    <WeeklyPlanCarryOverModal
      open={carryOverOpen}
      itemTitle={todo.title}
      fromWeek={weeklyPlanSource?.kind === 'exam-prep' ? weeklyPlanSource.weekNumber : 1}
      weekOptions={carryOverWeekOptions}
      selectedWeek={carryOverWeek}
      loading={carryOverLoading}
      error={carryOverError}
      onSelectedWeekChange={setCarryOverWeek}
      onConfirm={() => {
        void handleConfirmWeeklyPlanCarryOver();
      }}
      onClose={() => {
        if (carryOverLoading) {
          return;
        }
        setCarryOverOpen(false);
        setCarryOverError('');
      }}
    />
  </>
  );
}
