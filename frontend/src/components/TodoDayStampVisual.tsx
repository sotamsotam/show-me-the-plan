'use client';

import Image from 'next/image';
import { formatTodoDayStampDisplayMessage } from '@/lib/todo-day-stamp-helpers';

interface TodoDayStampVisualProps {
  message: string;
  variant?: 'preview' | 'footer';
  className?: string;
}

const VARIANT_STYLES = {
  preview: {
    wrapper: 'h-40 w-40',
    imageOpacity: '',
    wrapperOpacity: '',
    imageSizes: '(max-width: 640px) 160px, 160px',
  },
  footer: {
    wrapper: 'h-28 w-28 sm:h-32 sm:w-32',
    imageOpacity: '',
    wrapperOpacity: '',
    imageSizes: '(max-width: 640px) 112px, 128px',
  },
} as const;

export default function TodoDayStampVisual({
  message,
  variant = 'preview',
  className = '',
}: TodoDayStampVisualProps) {
  const styles = VARIANT_STYLES[variant];
  const displayMessage = formatTodoDayStampDisplayMessage(message);
  const isMultiline = displayMessage.includes('\n');
  const textSizeClass =
    variant === 'preview'
      ? isMultiline
        ? 'text-base'
        : 'text-lg'
      : isMultiline
        ? 'text-xs sm:text-sm'
        : 'text-sm sm:text-base';

  return (
    <div
      className={`relative flex items-center justify-center ${styles.wrapper} ${styles.wrapperOpacity} ${className}`}
      aria-hidden={variant === 'footer'}
    >
      <Image
        src="/images/stamp.png"
        alt=""
        fill
        sizes={styles.imageSizes}
        className={`object-contain ${styles.imageOpacity}`}
        priority={variant === 'preview'}
      />
      <p
        className={`pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center leading-snug whitespace-pre-wrap ${textSizeClass} font-bold tracking-tight text-[#1b4fd8]`}
      >
        {displayMessage}
      </p>
    </div>
  );
}
