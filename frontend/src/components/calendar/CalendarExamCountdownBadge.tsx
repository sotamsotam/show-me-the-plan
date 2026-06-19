'use client';

import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import ExamCountdownBadge from '@/components/calendar/ExamCountdownBadge';
import type { ExamCountdownResult } from '@/lib/exam-countdown';

interface CalendarExamCountdownBadgeProps {
  containerRef: RefObject<HTMLElement | null>;
  countdown: ExamCountdownResult | null;
  toolbarVersion: number;
}

export default function CalendarExamCountdownBadge({
  containerRef,
  countdown,
  toolbarVersion,
}: CalendarExamCountdownBadgeProps) {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      setMountNode(null);
      return;
    }

    const centerChunk = container.querySelector('.fc-toolbar-chunk:nth-child(2)');
    if (!centerChunk) {
      setMountNode(null);
      return;
    }

    let host = centerChunk.querySelector('[data-exam-countdown-host]') as HTMLElement | null;

    if (!host) {
      host = document.createElement('span');
      host.setAttribute('data-exam-countdown-host', '');
      host.className = 'exam-countdown-host';
      centerChunk.appendChild(host);
    }

    centerChunk.classList.add('fc-toolbar-chunk--with-countdown');
    setMountNode(host);
  }, [containerRef, toolbarVersion]);

  if (!mountNode || !countdown) {
    return null;
  }

  return createPortal(<ExamCountdownBadge countdown={countdown} />, mountNode);
}
