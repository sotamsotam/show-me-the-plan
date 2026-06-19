'use client';

import { triggerHaptic } from '@/lib/haptic';

interface MobileFabProps {
  label: string;
  onClick: () => void;
}

export default function MobileFab({ label, onClick }: MobileFabProps) {
  function handleClick() {
    triggerHaptic('light');
    onClick();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className="touch-press fixed bottom-[calc(3.5rem+1rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 md:hidden dark:shadow-black/40"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="h-6 w-6"
        aria-hidden
      >
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    </button>
  );
}
