'use client';

import { useEffect, type ReactNode } from 'react';

export type MobileOverlayVariant = 'sheet' | 'fullscreen';

interface ResponsiveOverlayProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  mobileVariant?: MobileOverlayVariant;
  contentClassName?: string;
}

export default function ResponsiveOverlay({
  open,
  onClose,
  children,
  title,
  mobileVariant = 'sheet',
  contentClassName = '',
}: ResponsiveOverlayProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const isFullscreen = mobileVariant === 'fullscreen';

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="닫기"
        onClick={onClose}
      />

      <div
        className={`absolute inset-0 flex ${
          isFullscreen
            ? 'flex-col md:items-center md:justify-center md:p-4'
            : 'flex-col justify-end md:items-center md:justify-center md:p-4'
        }`}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'responsive-overlay-title' : undefined}
          className={`flex w-full flex-col bg-white shadow-lg dark:bg-zinc-900 ${
            isFullscreen
              ? 'h-full overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:h-auto md:max-h-[90vh] md:max-w-md md:rounded-xl md:border md:border-gray-200 md:p-6 dark:md:border-neutral-700'
              : 'max-h-[92dvh] animate-sheet-up overflow-y-auto rounded-t-2xl border-t border-gray-200 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:max-h-[90vh] md:max-w-md md:animate-none md:rounded-xl md:border md:border-gray-200 md:p-6 dark:border-neutral-700 dark:md:border-neutral-700'
          } ${contentClassName}`}
          onClick={(event) => event.stopPropagation()}
        >
          {!isFullscreen && (
            <div
              className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-gray-300 dark:bg-neutral-600 md:hidden"
              aria-hidden
            />
          )}
          {title && (
            <h2
              id="responsive-overlay-title"
              className={`font-semibold text-gray-900 dark:text-gray-100 ${
                isFullscreen
                  ? 'mb-4 text-xl md:mb-0 md:text-lg'
                  : 'mb-4 text-lg md:mb-0'
              }`}
            >
              {title}
            </h2>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
