'use client';

import { useEffect, useRef, type RefObject } from 'react';

interface CalendarPrintToolbarButtonProps {
  containerRef: RefObject<HTMLElement | null>;
  toolbarVersion: number;
  visible: boolean;
  disabled?: boolean;
  onPrint: () => void;
}

function syncPrintToolbarButton(
  container: HTMLElement,
  visible: boolean,
  disabled: boolean,
  onPrint: () => void
): (() => void) | undefined {
  const rightChunk = container.querySelector('.fc-toolbar-chunk:nth-child(3)');
  if (!rightChunk) {
    return undefined;
  }

  let host = rightChunk.querySelector('[data-weekly-print-host]') as HTMLElement | null;

  if (!host) {
    host = document.createElement('span');
    host.setAttribute('data-weekly-print-host', '');
    host.className = 'weekly-print-toolbar-host';
    rightChunk.appendChild(host);
  }

  host.hidden = !visible;
  host.style.display = visible ? '' : 'none';

  if (!visible) {
    return undefined;
  }

  let button = host.querySelector('button') as HTMLButtonElement | null;

  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    host.appendChild(button);
  }

  button.className = 'weekly-print-toolbar-button';
  button.replaceChildren();
  button.setAttribute('aria-label', '일정표 인쇄');
  button.setAttribute('title', '일정표 인쇄');
  button.disabled = disabled;
  button.onclick = () => {
    if (!button.disabled) {
      onPrint();
    }
  };

  return () => {
    button.onclick = null;
  };
}

export default function CalendarPrintToolbarButton({
  containerRef,
  toolbarVersion,
  visible,
  disabled = false,
  onPrint,
}: CalendarPrintToolbarButtonProps) {
  const onPrintRef = useRef(onPrint);
  onPrintRef.current = onPrint;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cleanup: (() => void) | undefined;
    let frameId = 0;
    let timeoutId = 0;

    const attach = () => {
      cleanup?.();
      cleanup = syncPrintToolbarButton(container, visible, disabled, () => onPrintRef.current());
    };

    attach();
    frameId = window.requestAnimationFrame(attach);
    timeoutId = window.setTimeout(attach, 0);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      cleanup?.();
    };
  }, [containerRef, disabled, toolbarVersion, visible]);

  return null;
}
