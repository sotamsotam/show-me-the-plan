'use client';

import ResponsiveOverlay from '@/components/ResponsiveOverlay';
import { formatOccurrenceDateLabel, type UserSchedule } from '@/lib/user-schedule';

interface UserScheduleOccurrenceChooserProps {
  open: boolean;
  schedule: UserSchedule;
  occurrenceDate: string;
  onClose: () => void;
  onEditOccurrence: () => void;
  onDeleteOccurrence: () => void;
  onEditSeries: () => void;
}

export default function UserScheduleOccurrenceChooser({
  open,
  schedule,
  occurrenceDate,
  onClose,
  onEditOccurrence,
  onDeleteOccurrence,
  onEditSeries,
}: UserScheduleOccurrenceChooserProps) {
  return (
    <ResponsiveOverlay open={open} onClose={onClose} mobileVariant="sheet">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {schedule.title}
        <span className="ml-1.5 text-sm font-normal text-gray-400 dark:text-gray-500">
          (반복일정)
        </span>
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {formatOccurrenceDateLabel(occurrenceDate)}
      </p>

      <div className="mt-5 space-y-2">
        <button
          type="button"
          onClick={onEditOccurrence}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:border-neutral-600 dark:hover:bg-zinc-800"
        >
          이 날짜만 수정
        </button>
        <button
          type="button"
          onClick={onDeleteOccurrence}
          className="w-full rounded-lg border border-red-200 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
        >
          이 날짜만 삭제
        </button>
        <button
          type="button"
          onClick={onEditSeries}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:border-neutral-600 dark:hover:bg-zinc-800"
        >
          전체 반복 일정 수정
        </button>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-neutral-600"
        >
          취소
        </button>
      </div>
    </ResponsiveOverlay>
  );
}
