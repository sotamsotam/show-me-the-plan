import { createRoot, type Root } from 'react-dom/client';
import MonthlySchedulePrintView from '@/components/calendar/MonthlySchedulePrintView';
import {
  layoutMonthlyPrintPage,
  prepareMonthlyPrintFrameForLayout,
} from '@/lib/fit-monthly-print-page';
import {
  buildMonthlyPrintGrid,
  type MonthlyPrintInput,
} from '@/lib/monthly-schedule-print';

const PRINT_STYLE_HREF = '/styles/monthly-schedule-print.css';

function waitForStylesheet(link: HTMLLinkElement): Promise<void> {
  if (link.sheet) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
  });
}

function createHiddenPrintFrame(): HTMLIFrameElement | null {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', '월간 일정표 인쇄');
  iframe.style.cssText =
    'position:fixed;left:-10000px;top:0;border:0;visibility:hidden;pointer-events:none;overflow:visible;';

  document.body.appendChild(iframe);

  if (!iframe.contentDocument || !iframe.contentWindow) {
    iframe.remove();
    return null;
  }

  prepareMonthlyPrintFrameForLayout(iframe);

  return iframe;
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

export async function printMonthlySchedule(input: MonthlyPrintInput): Promise<boolean> {
  const iframe = createHiddenPrintFrame();
  if (!iframe) {
    return false;
  }

  const printDocument = iframe.contentDocument;
  const printWindow = iframe.contentWindow;

  if (!printDocument || !printWindow) {
    iframe.remove();
    return false;
  }

  const grid = buildMonthlyPrintGrid(input);
  let root: Root | null = null;

  const cleanup = () => {
    root?.unmount();
    iframe.remove();
  };

  try {
    printDocument.open();
    printDocument.write(
      '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8" /><title>월간 일정표</title></head><body></body></html>'
    );
    printDocument.close();
    printDocument.title = '월간 일정표';

    const styleLink = printDocument.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = new URL(PRINT_STYLE_HREF, window.location.origin).href;
    printDocument.head.appendChild(styleLink);

    const mountNode = printDocument.createElement('div');
    printDocument.body.appendChild(mountNode);

    await waitForStylesheet(styleLink);

    root = createRoot(mountNode);
    root.render(<MonthlySchedulePrintView grid={grid} userName={input.userName} />);

    await waitForPaint();

    const pageRoot = mountNode.querySelector('.monthly-print-page') as HTMLElement | null;
    if (pageRoot) {
      layoutMonthlyPrintPage(pageRoot, {
        weekCount: grid.weekCount,
      });
      await waitForPaint();
    }

    printWindow.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 60_000);

    printWindow.focus();
    printWindow.print();

    return true;
  } catch {
    cleanup();
    return false;
  }
}
