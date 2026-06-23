'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState, type ReactNode } from 'react';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!open || !mounted) {
    return null;
  }

  const isFullscreen = mobileVariant === 'fullscreen';

  return createPortal(
    <div className="fixed inset-0 z-[120]">
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
          <div
            className={`flex items-start justify-between gap-3 ${
              title ? (isFullscreen ? 'mb-4 md:mb-0' : 'mb-4 md:mb-0') : 'mb-2'
            }`}
          >
            {title ? (
              <h2
                id="responsive-overlay-title"
                className={`min-w-0 flex-1 font-semibold text-gray-900 dark:text-gray-100 ${
                  isFullscreen ? 'text-xl md:text-lg' : 'text-lg'
                }`}
              >
                {title}
              </h2>
            ) : (
              <span className="sr-only" id="responsive-overlay-title">
                모달
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="touch-target touch-press -mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-200"
              aria-label="닫기"
            >
              <span aria-hidden className="text-xl leading-none">
                ×
              </span>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
