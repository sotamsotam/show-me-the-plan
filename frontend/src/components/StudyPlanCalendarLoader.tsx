'use client';

import dynamic from 'next/dynamic';

const StudyPlanCalendar = dynamic(
  () =>
    import('@/components/StudyPlanCalendar').then((module) => module.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-500 dark:border-neutral-800 dark:bg-zinc-900 dark:text-gray-400">
        캘린더를 불러오는 중...
      </div>
    ),
  }
);

export default function StudyPlanCalendarLoader() {
  return <StudyPlanCalendar />;
}
