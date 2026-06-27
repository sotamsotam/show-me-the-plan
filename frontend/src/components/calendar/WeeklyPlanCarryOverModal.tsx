'use client';

import { formatPrepWeekLabel } from '@/lib/exam-countdown';
import ResponsiveOverlay from '@/components/ResponsiveOverlay';

export interface WeeklyPlanCarryOverModalProps {
  open: boolean;
  itemTitle: string;
  fromWeek: number;
  weekOptions: number[];
  selectedWeek: number;
  loading?: boolean;
  error?: string;
  onSelectedWeekChange: (week: number) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function WeeklyPlanCarryOverModal({
  open,
  itemTitle,
  fromWeek,
  weekOptions,
  selectedWeek,
  loading = false,
  error = '',
  onSelectedWeekChange,
  onConfirm,
  onClose,
}: WeeklyPlanCarryOverModalProps) {
  return (
    <ResponsiveOverlay open={open} onClose={onClose} title="다른 주로 이월" mobileVariant="sheet">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          「{itemTitle}」을(를) {formatPrepWeekLabel(fromWeek)}에서 다른 주차로 옮깁니다. 캘린더
          일정은 삭제되고, 선택한 주차의 미배치 목록에 추가됩니다.
        </p>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">대상 주차</span>
          <select
            value={selectedWeek}
            onChange={(event) => onSelectedWeekChange(Number(event.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800 dark:text-gray-100"
          >
            {weekOptions.map((weekNumber) => (
              <option key={weekNumber} value={weekNumber}>
                {formatPrepWeekLabel(weekNumber)}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-neutral-600"
            disabled={loading}
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
            disabled={loading || weekOptions.length === 0}
          >
            {loading ? '이월 중...' : '이월하기'}
          </button>
        </div>
      </div>
    </ResponsiveOverlay>
  );
}
