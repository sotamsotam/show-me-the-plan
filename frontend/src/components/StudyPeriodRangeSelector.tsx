'use client';

import { formatStudyPeriodOptionLabel } from '@/lib/study-period-range-options';
import type { StudyPeriodRangeOption } from '@/lib/study-period-range-options';

interface StudyPeriodRangeSelectorProps {
  rangeStart: string;
  rangeEnd: string;
  selectedPeriodKey: string;
  periodOptions: StudyPeriodRangeOption[];
  periodOptionsLoading: boolean;
  onPeriodSelect: (periodKey: string) => void;
  onRangeStartChange: (value: string) => void;
  onRangeEndChange: (value: string) => void;
}

export default function StudyPeriodRangeSelector({
  rangeStart,
  rangeEnd,
  selectedPeriodKey,
  periodOptions,
  periodOptionsLoading,
  onPeriodSelect,
  onRangeStartChange,
  onRangeEndChange,
}: StudyPeriodRangeSelectorProps) {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <p className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">조회 구간</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
          구간 선택
          <select
            value={selectedPeriodKey}
            onChange={(event) => onPeriodSelect(event.target.value)}
            disabled={periodOptionsLoading || periodOptions.length === 0}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-zinc-950 dark:text-gray-100"
          >
            <option value="">
              {periodOptionsLoading
                ? '구간 불러오는 중...'
                : periodOptions.length === 0
                  ? '설정된 구간 없음'
                  : '직접 입력'}
            </option>
            {periodOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {formatStudyPeriodOptionLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
          시작일
          <input
            type="date"
            value={rangeStart}
            onChange={(event) => onRangeStartChange(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-neutral-700 dark:bg-zinc-950 dark:text-gray-100"
          />
        </label>
        <span className="pb-2 text-sm text-gray-400">~</span>
        <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
          종료일
          <input
            type="date"
            value={rangeEnd}
            onChange={(event) => onRangeEndChange(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-neutral-700 dark:bg-zinc-950 dark:text-gray-100"
          />
        </label>
      </div>
    </div>
  );
}
