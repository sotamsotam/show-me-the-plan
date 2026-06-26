interface GuideScreenshotPlaceholderProps {
  label?: string;
}

export default function GuideScreenshotPlaceholder({
  label = '화면 이미지 준비 중',
}: GuideScreenshotPlaceholderProps) {
  return (
    <div
      className="mt-5 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50/80 dark:border-neutral-600 dark:bg-zinc-800/40"
      aria-hidden
    >
      <div className="flex aspect-[16/10] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200/80 dark:bg-zinc-700/80">
          <svg
            className="h-6 w-6 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
            />
          </svg>
        </span>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}
