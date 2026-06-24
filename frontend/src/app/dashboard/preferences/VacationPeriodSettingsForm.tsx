'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNeisTimetableEnabled } from '@/hooks/useNeisTimetableEnabled';
import { useStudentApi } from '@/hooks/useStudentApi';
import {
  buildSlotDateInputsFromSettingsAndSuggestions,
  createEmptySlotDateInputs,
  createEmptyVacationPeriodSettings,
  draftRangeFromInputs,
  rangeToDateInputs,
  resolveVacationPeriodSettings,
  VACATION_PERIOD_SLOTS,
  VACATION_PERIOD_SLOT_LABELS,
  type NeisVacationSuggestions,
  type VacationPeriodSettings,
  type VacationPeriodSettingsResponse,
  type VacationPeriodSlot,
} from '@/lib/vacation-period-settings';

type SlotDateInputs = ReturnType<typeof createEmptySlotDateInputs>;

function slotInputsToSettings(inputs: SlotDateInputs): VacationPeriodSettings {
  const settings = createEmptyVacationPeriodSettings();

  for (const slot of VACATION_PERIOD_SLOTS) {
    const { start, end } = inputs[slot];

    if (!start && !end) {
      settings[slot] = null;
      continue;
    }

    const range = draftRangeFromInputs(start, end);
    settings[slot] = range;
  }

  return settings;
}

function formatSuggestionHint(
  slot: VacationPeriodSlot,
  suggestion: NeisVacationSuggestions[VacationPeriodSlot]
): string | null {
  if (!suggestion?.start && !suggestion?.end) {
    return null;
  }

  const start = suggestion.start ? rangeToDateInputs({ start: suggestion.start, end: suggestion.start }).start : '';
  const end = suggestion.end ? rangeToDateInputs({ end: suggestion.end, start: suggestion.end }).end : '';

  if (start && end) {
    return `학교공지 학사일정 제안: ${start} ~ ${end}`;
  }

  if (start) {
    return `학교공지 학사일정 제안 시작일: ${start}`;
  }

  return `학교공지 학사일정 제안 종료일: ${end}`;
}

export default function VacationPeriodSettingsForm() {
  const { withStudent, studentUserId } = useStudentApi();
  const { usesNeisTimetable } = useNeisTimetableEnabled();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slotInputs, setSlotInputs] = useState<SlotDateInputs>(createEmptySlotDateInputs);
  const [neisSuggestions, setNeisSuggestions] = useState<NeisVacationSuggestions>({
    summer: null,
    winter: null,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loaded, setLoaded] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    setLoaded(false);

    try {
      const res = await fetch(withStudent('/api/profile/vacation-period-settings'), {
        credentials: 'include',
      });
      const data = (await res.json()) as VacationPeriodSettingsResponse & {
        error?: string;
      };

      if (!res.ok) {
        const message =
          data.error === 'Forbidden'
            ? '방학기간 설정 API 권한이 없습니다. 백엔드 서버를 재시작한 뒤 다시 시도해 주세요.'
            : (data.error ?? '방학기간 설정을 불러오지 못했습니다.');
        setError(message);
        return;
      }

      const savedSettings = resolveVacationPeriodSettings(data.vacationPeriodSettings);
      const suggestions = data.neisVacationSuggestions ?? { summer: null, winter: null };
      const inputs = buildSlotDateInputsFromSettingsAndSuggestions(savedSettings, suggestions);

      setNeisSuggestions(suggestions);
      setSlotInputs(inputs);
      setLoaded(true);
    } catch {
      setError('방학기간 설정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [withStudent]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings, studentUserId]);

  function handleDateChange(
    slot: VacationPeriodSlot,
    field: 'start' | 'end',
    value: string
  ) {
    setSlotInputs((current) => ({
      ...current,
      [slot]: {
        ...current[slot],
        [field]: value,
      },
    }));
    setSuccess('');
  }

  const clientValidationError = useMemo(() => {
    for (const slot of VACATION_PERIOD_SLOTS) {
      const { start, end } = slotInputs[slot];

      if ((start && !end) || (!start && end)) {
        return `${VACATION_PERIOD_SLOT_LABELS[slot]} 시작일과 종료일을 모두 입력해 주세요.`;
      }

      if (start && end && !draftRangeFromInputs(start, end)) {
        return `${VACATION_PERIOD_SLOT_LABELS[slot]} 날짜 범위가 올바르지 않습니다.`;
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

    setSaving(true);

    try {
      const vacationPeriodSettings = slotInputsToSettings(slotInputs);
      const body: {
        vacationPeriodSettings: VacationPeriodSettings;
        studentUserId?: number;
      } = { vacationPeriodSettings };

      if (studentUserId) {
        body.studentUserId = studentUserId;
      }

      const res = await fetch('/api/profile/vacation-period-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '방학기간 설정 저장에 실패했습니다.');
        return;
      }

      const saved = resolveVacationPeriodSettings(data.vacationPeriodSettings);
      setSlotInputs(
        buildSlotDateInputsFromSettingsAndSuggestions(saved, neisSuggestions)
      );
      setSuccess('방학기간 설정이 저장되었습니다.');
    } catch {
      setError('방학기간 설정 저장에 실패했습니다.');
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
          <h2 className="text-lg font-medium text-white">방학기간 설정</h2>
          <p className="mt-1 text-sm text-[#e2feff]">
            여름·겨울 방학 기간을 입력하면 주차별 공부계획에 반영됩니다.
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
        <h2 className="text-lg font-medium text-white">방학기간 설정</h2>
        <p className="mt-1 text-sm text-[#e2feff]">
          여름·겨울 방학 기간을 입력하면 주차별 공부계획과 스터디 플랜에 반영됩니다.
          {usesNeisTimetable
            ? ' 학교공지의 학사일정에 방학·개학일이 있으면 초기값으로 채워집니다.'
            : ' 기타학생 계정은 방학 기간을 직접 입력해 주세요.'}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900"
      >
        {VACATION_PERIOD_SLOTS.map((slot) => {
          const hint = usesNeisTimetable
            ? formatSuggestionHint(slot, neisSuggestions[slot])
            : null;

          return (
            <fieldset
              key={slot}
              className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-neutral-700"
            >
              <legend className="px-1 text-sm font-medium">{VACATION_PERIOD_SLOT_LABELS[slot]}</legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor={`vacation-${slot}-start`} className="block text-sm text-gray-600 dark:text-gray-300">
                    시작일
                  </label>
                  <input
                    id={`vacation-${slot}-start`}
                    type="date"
                    value={slotInputs[slot].start}
                    onChange={(event) => handleDateChange(slot, 'start', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`vacation-${slot}-end`} className="block text-sm text-gray-600 dark:text-gray-300">
                    종료일
                  </label>
                  <input
                    id={`vacation-${slot}-end`}
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
                  학교공지가 없으면 직접 입력해 주세요.
                </p>
              )}
            </fieldset>
          );
        })}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '방학기간 저장'}
        </button>
      </form>
    </section>
  );
}
