'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNeisTimetableEnabled } from '@/hooks/useNeisTimetableEnabled';
import { useStudentApi } from '@/hooks/useStudentApi';
import {
  DEFAULT_EXAM_PREP_WEEKS,
  EXAM_ROUND_LABELS,
  EXAM_ROUND_SLOTS,
  MAX_EXAM_PREP_WEEKS,
  MIN_EXAM_PREP_WEEKS,
  resolveExamPrepWeeksByRound,
  type ExamPrepWeeksByRound,
  type ExamRoundSlot,
} from '@/lib/exam-countdown';
import {
  draftRangeFromInputs,
  rangeToDateInputs,
  resolveExamPeriodSettings,
  type ExamPeriodSettings,
  type NeisExamSuggestions,
} from '@/lib/exam-period-settings';

const PRESET_WEEKS = [2, 3, 4, 5, 6, 7, 8] as const;

type SelectMode = (typeof PRESET_WEEKS)[number] | 'custom';

type SlotDateInputs = Record<ExamRoundSlot, { start: string; end: string }>;

function createEmptySlotDateInputs(): SlotDateInputs {
  return EXAM_ROUND_SLOTS.reduce(
    (inputs, slot) => {
      inputs[slot] = { start: '', end: '' };
      return inputs;
    },
    {} as SlotDateInputs
  );
}

function settingsToSlotDateInputs(settings: ExamPeriodSettings): SlotDateInputs {
  return EXAM_ROUND_SLOTS.reduce(
    (inputs, slot) => {
      inputs[slot] = rangeToDateInputs(settings[slot]);
      return inputs;
    },
    {} as SlotDateInputs
  );
}

function slotInputsToSettings(inputs: SlotDateInputs): ExamPeriodSettings {
  const settings = resolveExamPeriodSettings(null);

  for (const slot of EXAM_ROUND_SLOTS) {
    const { start, end } = inputs[slot];

    if (!start && !end) {
      settings[slot] = null;
      continue;
    }

    settings[slot] = draftRangeFromInputs(start, end);
  }

  return settings;
}

function weeksToSelectMode(weeks: number): SelectMode {
  return PRESET_WEEKS.includes(weeks as (typeof PRESET_WEEKS)[number])
    ? (weeks as SelectMode)
    : 'custom';
}

function createEmptySelectModes(
  settings: ExamPrepWeeksByRound
): Record<ExamRoundSlot, SelectMode> {
  return EXAM_ROUND_SLOTS.reduce(
    (modes, slot) => {
      modes[slot] = weeksToSelectMode(settings.weeksBySlot[slot]);
      return modes;
    },
    {} as Record<ExamRoundSlot, SelectMode>
  );
}

function createEmptyCustomWeeks(
  settings: ExamPrepWeeksByRound
): Record<ExamRoundSlot, string> {
  return EXAM_ROUND_SLOTS.reduce(
    (weeks, slot) => {
      weeks[slot] = String(settings.weeksBySlot[slot]);
      return weeks;
    },
    {} as Record<ExamRoundSlot, string>
  );
}

function formatSuggestionHint(
  slot: ExamRoundSlot,
  suggestion: NeisExamSuggestions[ExamRoundSlot]
): string | null {
  if (!suggestion?.start && !suggestion?.end) {
    return null;
  }

  const start = suggestion.start
    ? rangeToDateInputs({ start: suggestion.start, end: suggestion.start }).start
    : '';
  const end = suggestion.end
    ? rangeToDateInputs({ end: suggestion.end, start: suggestion.end }).end
    : '';

  const labelSuffix = suggestion.label ? ` (${suggestion.label})` : '';

  if (start && end) {
    return `학교공지 학사일정 제안: ${start} ~ ${end}${labelSuffix}`;
  }

  if (start) {
    return `학교공지 학사일정 제안 시작일: ${start}${labelSuffix}`;
  }

  return `학교공지 학사일정 제안 종료일: ${end}${labelSuffix}`;
}

export default function ExamPrepSettingsForm() {
  const { withStudent, studentUserId } = useStudentApi();
  const { usesNeisTimetable } = useNeisTimetableEnabled();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectModes, setSelectModes] = useState<Record<ExamRoundSlot, SelectMode>>(
    () => createEmptySelectModes(resolveExamPrepWeeksByRound(null))
  );
  const [customWeeks, setCustomWeeks] = useState<Record<ExamRoundSlot, string>>(
    () => createEmptyCustomWeeks(resolveExamPrepWeeksByRound(null))
  );
  const [slotInputs, setSlotInputs] = useState<SlotDateInputs>(createEmptySlotDateInputs);
  const [neisSuggestions, setNeisSuggestions] = useState<NeisExamSuggestions>(
    () =>
      EXAM_ROUND_SLOTS.reduce(
        (suggestions, slot) => {
          suggestions[slot] = null;
          return suggestions;
        },
        {} as NeisExamSuggestions
      )
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loaded, setLoaded] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    setLoaded(false);

    try {
      const res = await fetch(withStudent('/api/profile/exam-prep-settings'), {
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '설정을 불러오지 못했습니다.');
        return;
      }

      const settings = resolveExamPrepWeeksByRound(
        data.examPrepWeeksByRound,
        data.examPrepWeeksBefore
      );
      const savedPeriodSettings = resolveExamPeriodSettings(data.examPeriodSettings);
      const suggestions = data.neisExamSuggestions ?? {};
      const inputs = settingsToSlotDateInputs(savedPeriodSettings);

      for (const slot of EXAM_ROUND_SLOTS) {
        if (savedPeriodSettings[slot]) {
          continue;
        }

        const suggestion = suggestions[slot];
        if (!suggestion) {
          continue;
        }

        if (suggestion.start) {
          inputs[slot].start = rangeToDateInputs({
            start: suggestion.start,
            end: suggestion.start,
          }).start;
        }

        if (suggestion.end) {
          inputs[slot].end = rangeToDateInputs({
            start: suggestion.end,
            end: suggestion.end,
          }).end;
        }
      }

      setSelectModes(createEmptySelectModes(settings));
      setCustomWeeks(createEmptyCustomWeeks(settings));
      setNeisSuggestions(
        EXAM_ROUND_SLOTS.reduce(
          (next, slot) => {
            next[slot] = suggestions[slot] ?? null;
            return next;
          },
          {} as NeisExamSuggestions
        )
      );
      setSlotInputs(inputs);
      setLoaded(true);
    } catch {
      setError('설정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [withStudent]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings, studentUserId]);

  function handleDateChange(slot: ExamRoundSlot, field: 'start' | 'end', value: string) {
    setSlotInputs((current) => ({
      ...current,
      [slot]: {
        ...current[slot],
        [field]: value,
      },
    }));
    setSuccess('');
  }

  function resolveWeeksForSlot(slot: ExamRoundSlot): number | null {
    const mode = selectModes[slot];

    if (mode === 'custom') {
      const weeks = Number(customWeeks[slot]);
      if (
        !Number.isInteger(weeks) ||
        weeks < MIN_EXAM_PREP_WEEKS ||
        weeks > MAX_EXAM_PREP_WEEKS
      ) {
        return null;
      }
      return weeks;
    }

    return mode;
  }

  function resolveWeekSettingsToSave(): ExamPrepWeeksByRound | null {
    const weeksBySlot = {} as Record<ExamRoundSlot, number>;

    for (const slot of EXAM_ROUND_SLOTS) {
      const weeks = resolveWeeksForSlot(slot);
      if (weeks === null) {
        return null;
      }
      weeksBySlot[slot] = weeks;
    }

    return {
      defaultWeeks: DEFAULT_EXAM_PREP_WEEKS,
      weeksBySlot,
    };
  }

  const clientValidationError = useMemo(() => {
    for (const slot of EXAM_ROUND_SLOTS) {
      const { start, end } = slotInputs[slot];

      if ((start && !end) || (!start && end)) {
        return `${EXAM_ROUND_LABELS[slot]} 시험 시작일과 종료일을 모두 입력해 주세요.`;
      }

      if (start && end && !draftRangeFromInputs(start, end)) {
        return `${EXAM_ROUND_LABELS[slot]} 시험 날짜 범위가 올바르지 않습니다.`;
      }
    }

    return '';
  }, [slotInputs]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (clientValidationError) {
      setError(clientValidationError);
      return;
    }

    const weekSettings = resolveWeekSettingsToSave();
    if (weekSettings === null) {
      setError(
        `직접 입력 값은 ${MIN_EXAM_PREP_WEEKS}~${MAX_EXAM_PREP_WEEKS}주 사이의 정수여야 합니다.`
      );
      return;
    }

    setSaving(true);

    try {
      const examPeriodSettings = slotInputsToSettings(slotInputs);
      const body: {
        examPrepWeeksByRound: ExamPrepWeeksByRound;
        examPeriodSettings: ExamPeriodSettings;
        studentUserId?: number;
      } = {
        examPrepWeeksByRound: weekSettings,
        examPeriodSettings,
      };

      if (studentUserId) {
        body.studentUserId = studentUserId;
      }

      const res = await fetch('/api/profile/exam-prep-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '설정 저장에 실패했습니다.');
        return;
      }

      const savedWeekSettings = resolveExamPrepWeeksByRound(
        data.examPrepWeeksByRound,
        data.examPrepWeeksBefore
      );
      const savedPeriodSettings = resolveExamPeriodSettings(data.examPeriodSettings);

      setSelectModes(createEmptySelectModes(savedWeekSettings));
      setCustomWeeks(createEmptyCustomWeeks(savedWeekSettings));
      setSlotInputs(settingsToSlotDateInputs(savedPeriodSettings));
      setSuccess('시험기간 설정이 저장되었습니다.');
    } catch {
      setError('설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-12">
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <section className="w-full space-y-4">
        <div>
          <h2 className="text-lg font-medium">시험기간 설정</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            시험 준비 기간을 설정하면 스케줄·스터디 플랜 캘린더에 D-day가 표시됩니다.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : (
            <p className="text-sm text-gray-500">데이터를 불러오지 못했습니다.</p>
          )}
          <button
            type="button"
            onClick={loadSettings}
            className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-zinc-800"
          >
            다시 시도
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-medium">시험기간 설정</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          회차별 시험 기간과 준비 시작 시점을 설정하면 스케줄·스터디 플랜 캘린더에 D-day가
          표시됩니다.
          {usesNeisTimetable
            ? ' 학교공지 학사일정에 시험일이 있으면 초기값으로 채워집니다.'
            : ' 기타학생 계정은 시험 기간을 직접 입력해 주세요.'}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900"
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          학교시험공지 일정이 부정확하면
          시험 시작일·종료일을 직접 수정해 저장할 수 있습니다.
        </p>

        <div className="space-y-6">
          {EXAM_ROUND_SLOTS.map((slot) => {
            const hint = usesNeisTimetable
              ? formatSuggestionHint(slot, neisSuggestions[slot])
              : null;

            return (
              <fieldset
                key={slot}
                className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-neutral-700"
              >
                <legend className="px-1 text-sm font-medium">{EXAM_ROUND_LABELS[slot]}</legend>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label
                      htmlFor={`exam-${slot}-start`}
                      className="block text-sm text-gray-600 dark:text-gray-300"
                    >
                      시험 시작일
                    </label>
                    <input
                      id={`exam-${slot}-start`}
                      type="date"
                      value={slotInputs[slot].start}
                      onChange={(event) =>
                        handleDateChange(slot, 'start', event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor={`exam-${slot}-end`}
                      className="block text-sm text-gray-600 dark:text-gray-300"
                    >
                      시험 종료일
                    </label>
                    <input
                      id={`exam-${slot}-end`}
                      type="date"
                      value={slotInputs[slot].end}
                      onChange={(event) => handleDateChange(slot, 'end', event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
                    />
                  </div>
                </div>

                {hint ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {usesNeisTimetable
                      ? '학교공지가 없으면 직접 입력해 주세요.'
                      : '시험 시작일·종료일을 직접 입력해 주세요.'}
                  </p>
                )}

                <div>
                  <label htmlFor={`exam-prep-weeks-${slot}`} className="mb-1 block text-sm">
                    시험 준비 시작 시점
                  </label>
                  <select
                    id={`exam-prep-weeks-${slot}`}
                    value={selectModes[slot]}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === 'custom') {
                        setSelectModes((current) => ({ ...current, [slot]: 'custom' }));
                        return;
                      }

                      const weeks = Number(value);
                      setSelectModes((current) => ({
                        ...current,
                        [slot]: weeks as SelectMode,
                      }));
                      setCustomWeeks((current) => ({
                        ...current,
                        [slot]: String(weeks),
                      }));
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
                  >
                    {PRESET_WEEKS.map((weeks) => (
                      <option key={weeks} value={weeks}>
                        시험 시작 {weeks}주전
                      </option>
                    ))}
                    <option value="custom">직접입력</option>
                  </select>

                  {selectModes[slot] === 'custom' && (
                    <div className="mt-3">
                      <label
                        htmlFor={`exam-prep-custom-weeks-${slot}`}
                        className="mb-1 block text-sm"
                      >
                        직접 입력 (주 단위)
                      </label>
                      <input
                        id={`exam-prep-custom-weeks-${slot}`}
                        type="number"
                        min={MIN_EXAM_PREP_WEEKS}
                        max={MAX_EXAM_PREP_WEEKS}
                        value={customWeeks[slot]}
                        onChange={(event) =>
                          setCustomWeeks((current) => ({
                            ...current,
                            [slot]: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
                      />
                    </div>
                  )}
                </div>
              </fieldset>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '시험기간 저장'}
        </button>
      </form>
    </section>
  );
}
