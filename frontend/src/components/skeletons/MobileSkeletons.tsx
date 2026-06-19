export function TodoListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="animate-pulse" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <li
          key={index}
          className={`px-4 py-3.5 ${
            index > 0 ? 'border-t border-gray-200 dark:border-neutral-800' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-1 rounded-full bg-gray-200 dark:bg-neutral-700" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-16 rounded bg-gray-200 dark:bg-neutral-700" />
              <div className="h-4 w-4/5 max-w-xs rounded bg-gray-200 dark:bg-neutral-700" />
              <div className="h-3 w-24 rounded bg-gray-200 dark:bg-neutral-700" />
            </div>
            <div className="h-11 w-11 rounded bg-gray-200 dark:bg-neutral-700" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4" aria-hidden>
      <div className="h-4 w-32 rounded bg-gray-200 dark:bg-neutral-700" />
      <div className="h-48 rounded-xl bg-gray-100 dark:bg-neutral-800" />
      <div className="flex gap-2">
        <div className="h-8 w-16 rounded-lg bg-gray-200 dark:bg-neutral-700" />
        <div className="h-8 w-16 rounded-lg bg-gray-200 dark:bg-neutral-700" />
        <div className="h-8 w-16 rounded-lg bg-gray-200 dark:bg-neutral-700" />
      </div>
    </div>
  );
}

export function ProgressCardSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-4 w-28 rounded bg-gray-200 dark:bg-neutral-700" />
      <div className="h-8 w-20 rounded bg-gray-200 dark:bg-neutral-700" />
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-neutral-700" />
    </div>
  );
}
