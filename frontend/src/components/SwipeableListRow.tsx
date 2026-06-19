'use client';

import { useRef, useState, type ReactNode } from 'react';
import { triggerHaptic } from '@/lib/haptic';

const ACTION_WIDTH = 80;
const OPEN_THRESHOLD = 40;
const DRAG_CLICK_THRESHOLD = 8;

interface SwipeableListRowProps {
  children: ReactNode;
  actionLabel: string;
  onAction: () => void;
  onTap?: () => void;
  disabled?: boolean;
  contentClassName?: string;
}

export default function SwipeableListRow({
  children,
  actionLabel,
  onAction,
  onTap,
  disabled = false,
  contentClassName = '',
}: SwipeableListRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const baseOffsetRef = useRef(0);
  const movedRef = useRef(false);

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (disabled) {
      return;
    }

    movedRef.current = false;
    startXRef.current = event.touches[0]?.clientX ?? 0;
    baseOffsetRef.current = offsetX;
    setDragging(true);
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (!dragging || disabled) {
      return;
    }

    const currentX = event.touches[0]?.clientX ?? startXRef.current;
    const delta = currentX - startXRef.current;

    if (Math.abs(delta) > DRAG_CLICK_THRESHOLD) {
      movedRef.current = true;
    }

    const nextOffset = Math.min(0, Math.max(-ACTION_WIDTH, baseOffsetRef.current + delta));
    setOffsetX(nextOffset);
  }

  function finishDrag() {
    setDragging(false);
    setOffsetX((current) => (current <= -OPEN_THRESHOLD ? -ACTION_WIDTH : 0));
  }

  function handleActionClick() {
    setOffsetX(0);
    triggerHaptic('light');
    onAction();
  }

  function handleContentClick() {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }

    onTap?.();
  }

  return (
    <div className="relative overflow-hidden md:overflow-visible">
      <div
        className="absolute inset-y-0 right-0 flex w-20 items-stretch md:hidden"
        aria-hidden={offsetX === 0}
      >
        <button
          type="button"
          onClick={handleActionClick}
          className="touch-press flex h-full w-full items-center justify-center bg-blue-600 text-sm font-medium text-white"
        >
          {actionLabel}
        </button>
      </div>

      <div
        className={`relative bg-white dark:bg-zinc-900 md:bg-transparent md:dark:bg-transparent ${
          dragging ? '' : 'transition-transform duration-200 ease-out'
        } ${contentClassName}`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishDrag}
        onTouchCancel={finishDrag}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
}
