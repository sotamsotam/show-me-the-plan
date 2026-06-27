import type { CheckboxVisualState } from '@/lib/study-plan-todo';

export type { CheckboxVisualState };
export { getCheckboxVisualState } from '@/lib/study-plan-todo';

const CHECKBOX_ICON_STYLES: Record<CheckboxVisualState, string> = {
  pending: 'text-gray-600 dark:text-gray-500',
  completed: 'text-green-600 dark:text-green-400',
  partial: 'text-amber-700 dark:text-amber-500',
  incomplete: 'text-red-600 dark:text-red-400',
};

const STATUS_ARIA_LABELS: Record<CheckboxVisualState, string> = {
  pending: '미실행',
  completed: '실행완료',
  partial: '부분실행',
  incomplete: '미완료',
};

const SIZE_CLASSES = {
  xs: 'h-4 w-4',
  sm: 'h-8 w-8',
  md: 'h-11 w-11',
} as const;

interface ExecutionStatusCheckboxProps {
  status: CheckboxVisualState;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export default function ExecutionStatusCheckbox({
  status,
  size = 'md',
  className = '',
}: ExecutionStatusCheckboxProps) {
  const isChecked = status === 'completed' || status === 'partial';
  const isIncomplete = status === 'incomplete';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={`shrink-0 ${SIZE_CLASSES[size]} ${CHECKBOX_ICON_STYLES[status]} ${className}`.trim()}
      role="img"
      aria-label={STATUS_ARIA_LABELS[status]}
    >
      <rect x="3" y="3" width="14" height="14" rx="2" />
      {isChecked ? (
        <path
          d="M6.5 10.5 8.75 12.75 13.5 7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {isIncomplete ? (
        <path
          d="M7.25 7.25 12.75 12.75M12.75 7.25 7.25 12.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}
