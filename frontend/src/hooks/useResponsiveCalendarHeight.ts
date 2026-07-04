'use client';

import { type RefObject, useEffect, useState } from 'react';

const MOBILE_BOTTOM_NAV_HEIGHT = 56;
const DESKTOP_BOTTOM_INSET = 16;
const MOBILE_BOTTOM_EXTRA = 8;

function resolveBottomInset(): number {
  if (window.matchMedia('(min-width: 768px)').matches) {
    return DESKTOP_BOTTOM_INSET;
  }

  const visualViewport = window.visualViewport;
  const safeArea =
    visualViewport != null
      ? Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop)
      : 0;

  return MOBILE_BOTTOM_NAV_HEIGHT + safeArea + MOBILE_BOTTOM_EXTRA;
}

function measureCalendarHeight(
  container: HTMLElement,
  minHeight: number
): number {
  const rect = container.getBoundingClientRect();
  const styles = getComputedStyle(container);
  const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;

  let extraContentHeight = 0;
  container.querySelectorAll('[data-calendar-help]').forEach((element) => {
    extraContentHeight += element.getBoundingClientRect().height;
    extraContentHeight += Number.parseFloat(getComputedStyle(element).marginBottom) || 0;
  });

  const available =
    window.innerHeight -
    rect.top -
    resolveBottomInset() -
    paddingTop -
    paddingBottom -
    extraContentHeight;

  return Math.max(minHeight, Math.floor(available));
}

export function useResponsiveCalendarHeight(
  containerRef: RefObject<HTMLElement | null>,
  options: { enabled: boolean; minHeight?: number }
): number | 'auto' {
  const { enabled, minHeight = 320 } = options;
  const [height, setHeight] = useState<number | 'auto'>(enabled ? minHeight : 'auto');

  useEffect(() => {
    if (!enabled) {
      setHeight('auto');
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const update = () => {
      setHeight(measureCalendarHeight(container, minHeight));
    };

    update();

    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(container);

    const scrollEl = container.closest('[data-dashboard-scroll]');
    if (scrollEl instanceof HTMLElement) {
      resizeObserver.observe(scrollEl);
    }

    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      resizeObserver.disconnect();
    };
  }, [containerRef, enabled, minHeight]);

  return height;
}
