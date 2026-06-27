'use client';

import { useEffect, useRef, type RefObject } from 'react';

interface CalendarWeeklyPlanToolbarToggleProps {
  containerRef: RefObject<HTMLElement | null>;
  toolbarVersion: number;
  activeViewType: string;
  visible: boolean;
  open: boolean;
  onToggle: () => void;
}

function syncWeeklyPlanToggleButton(
  container: HTMLElement,
  visible: boolean,
  open: boolean,
  onToggle: () => void
): (() => void) | undefined {
  const leftChunk = container.querySelector('.fc-toolbar-chunk:nth-child(1)');
  if (!leftChunk) {
    return undefined;
  }

  const existingHost = leftChunk.querySelector(
    '[data-weekly-plan-toggle-host]'
  ) as HTMLElement | null;

  if (!visible) {
    existingHost?.remove();
    return undefined;
  }

  let host = existingHost;

  if (!host) {
    host = document.createElement('span');
    host.setAttribute('data-weekly-plan-toggle-host', '');
    host.className = 'weekly-plan-toggle-host';

    const todayButton = leftChunk.querySelector('.fc-today-button');
    if (todayButton) {
      todayButton.insertAdjacentElement('afterend', host);
    } else {
      leftChunk.appendChild(host);
    }
  }

  let button = host.querySelector('button') as HTMLButtonElement | null;

  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    host.appendChild(button);
  }

  button.className = 'weekly-plan-toggle-button';
  button.textContent = open ? '주간 공부계획 닫기' : '주간공부계획 열기';
  button.setAttribute('aria-expanded', String(open));
  button.onclick = () => {
    onToggle();
  };

  return () => {
    button.onclick = null;
  };
}

export default function CalendarWeeklyPlanToolbarToggle({
  containerRef,
  toolbarVersion,
  activeViewType,
  visible,
  open,
  onToggle,
}: CalendarWeeklyPlanToolbarToggleProps) {
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;

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
      cleanup = syncWeeklyPlanToggleButton(container, visible, open, () =>
        onToggleRef.current()
      );
    };

    attach();
    frameId = window.requestAnimationFrame(attach);
    timeoutId = window.setTimeout(attach, 0);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      cleanup?.();
    };
  }, [activeViewType, containerRef, open, toolbarVersion, visible]);

  return null;
}
