export const A4_LANDSCAPE_WIDTH_MM = 297;
export const A4_LANDSCAPE_HEIGHT_MM = 210;
export const MONTHLY_PRINT_PAGE_MARGIN_MM = 8;

export const MONTHLY_PRINTABLE_WIDTH_MM = A4_LANDSCAPE_WIDTH_MM - MONTHLY_PRINT_PAGE_MARGIN_MM * 2;
export const MONTHLY_PRINTABLE_HEIGHT_MM = A4_LANDSCAPE_HEIGHT_MM - MONTHLY_PRINT_PAGE_MARGIN_MM * 2;

export const MONTHLY_PRINT_LAYOUT_SAFETY_MARGIN = 0.94;

export type MonthlyPrintDensity = 'comfortable' | 'compact' | 'dense';

export function mmToPx(mm: number, dpi = 96): number {
  return (mm / 25.4) * dpi;
}

export function resolveMonthlyPrintWeekCount(gridWeekCount: number): number {
  return gridWeekCount > 0 ? gridWeekCount : 1;
}

export function resolveMonthlyPrintDensity(
  weekCount: number,
  eventCount: number
): MonthlyPrintDensity {
  if (weekCount <= 5 && eventCount <= 24) {
    return 'comfortable';
  }

  if (weekCount <= 6 && eventCount <= 40) {
    return 'compact';
  }

  return 'dense';
}

export function resolveMonthlyPrintTableRowCount(weekCount: number): number {
  return 1 + resolveMonthlyPrintWeekCount(weekCount) * 2;
}

export interface DistributeMonthlyPrintRowsOptions {
  printableHeightPx?: number;
  tableRowCount?: number;
  safetyMargin?: number;
}

export interface FitMonthlyPrintPageOptions {
  printableWidthPx?: number;
  printableHeightPx?: number;
  safetyMargin?: number;
}

export function calculateMonthlyDistributedWeekHeight(
  printableHeightPx: number,
  headerHeightPx: number,
  weekCount: number,
  safetyMargin = MONTHLY_PRINT_LAYOUT_SAFETY_MARGIN
): number {
  if (weekCount <= 0) {
    return 0;
  }

  const weekdayHeaderHeight = 28;
  const borderAllowance = weekCount * 4 + 8;
  const availableHeight = Math.max(
    0,
    printableHeightPx * safetyMargin - headerHeightPx - weekdayHeaderHeight - borderAllowance
  );

  return availableHeight / weekCount;
}

function getPrintContentBlock(pageRoot: HTMLElement): HTMLElement {
  return (pageRoot.querySelector('.monthly-print-document') as HTMLElement | null) ?? pageRoot;
}

function applyPrintZoom(targetElement: HTMLElement, scale: number): void {
  if (scale >= 0.999) {
    targetElement.style.zoom = '';
    targetElement.style.transform = '';
    targetElement.style.transformOrigin = '';
    targetElement.style.width = '';
    return;
  }

  if ('zoom' in targetElement.style) {
    targetElement.style.zoom = String(scale);
    targetElement.style.transform = '';
    targetElement.style.transformOrigin = '';
    targetElement.style.width = '';
    return;
  }

  targetElement.style.zoom = '';
  targetElement.style.transformOrigin = 'top left';
  targetElement.style.transform = `scale(${scale})`;
  targetElement.style.width = `${100 / scale}%`;
}

function resetMonthlyPrintLayoutStyles(pageRoot: HTMLElement): void {
  const contentBlock = getPrintContentBlock(pageRoot);

  pageRoot.style.display = '';
  pageRoot.style.flexDirection = '';
  pageRoot.style.justifyContent = '';
  pageRoot.style.minHeight = '';
  pageRoot.style.maxHeight = '';
  pageRoot.style.paddingTop = '';
  pageRoot.style.paddingBottom = '';
  pageRoot.style.removeProperty('--print-page-height');

  contentBlock.style.transform = '';
  contentBlock.style.transformOrigin = '';
  contentBlock.style.width = '';
  contentBlock.style.height = '';
  contentBlock.style.zoom = '';

  pageRoot.style.removeProperty('--print-week-height');
  pageRoot.style.removeProperty('--print-table-height');
}

function measureDocumentHeaderHeight(pageRoot: HTMLElement): number {
  const docHeader = pageRoot.querySelector('.monthly-print-header') as HTMLElement | null;
  if (!docHeader) {
    return 0;
  }

  const marginBottom = Number.parseFloat(
    pageRoot.ownerDocument.defaultView?.getComputedStyle(docHeader).marginBottom ?? '0'
  );

  return docHeader.offsetHeight + marginBottom;
}

export function distributeMonthlyPrintWeekHeights(
  pageRoot: HTMLElement,
  options: DistributeMonthlyPrintRowsOptions & { weekCount?: number } = {}
): number {
  const printableHeightPx = options.printableHeightPx ?? mmToPx(MONTHLY_PRINTABLE_HEIGHT_MM);
  const safetyMargin = options.safetyMargin ?? MONTHLY_PRINT_LAYOUT_SAFETY_MARGIN;

  resetMonthlyPrintLayoutStyles(pageRoot);

  const headerHeightPx = measureDocumentHeaderHeight(pageRoot);
  const weekCount =
    options.weekCount ??
    pageRoot.querySelectorAll('.monthly-print-week-block').length;
  const resolvedWeekCount = resolveMonthlyPrintWeekCount(weekCount);

  const weekHeight = calculateMonthlyDistributedWeekHeight(
    printableHeightPx,
    headerHeightPx,
    resolvedWeekCount,
    safetyMargin
  );

  const tableHeight = weekHeight * resolvedWeekCount;

  pageRoot.style.setProperty('--print-week-height', `${weekHeight}px`);
  pageRoot.style.setProperty('--print-table-height', `${tableHeight}px`);

  const printDocument = pageRoot.ownerDocument;
  if (printDocument?.body) {
    printDocument.body.style.margin = '0';
    printDocument.body.style.padding = '0';
    printDocument.body.style.overflow = 'hidden';
    printDocument.documentElement.style.overflow = 'hidden';
  }

  return weekHeight;
}

export function fitMonthlyPrintPageToOnePage(
  pageRoot: HTMLElement,
  options: FitMonthlyPrintPageOptions = {}
): number {
  const printableWidthPx = options.printableWidthPx ?? mmToPx(MONTHLY_PRINTABLE_WIDTH_MM);
  const printableHeightPx = options.printableHeightPx ?? mmToPx(MONTHLY_PRINTABLE_HEIGHT_MM);
  const safetyMargin = options.safetyMargin ?? MONTHLY_PRINT_LAYOUT_SAFETY_MARGIN;
  const contentBlock = getPrintContentBlock(pageRoot);

  const contentHeight = pageRoot.scrollHeight;
  const contentWidth = pageRoot.scrollWidth;

  if (contentHeight <= 0 || contentWidth <= 0) {
    return 1;
  }

  const scale = Math.min(
    1,
    (printableHeightPx / contentHeight) * safetyMargin,
    (printableWidthPx / contentWidth) * safetyMargin
  );

  applyPrintZoom(contentBlock, scale >= 0.999 ? 1 : scale);

  const printDocument = pageRoot.ownerDocument;
  if (printDocument?.body) {
    printDocument.body.style.margin = '0';
    printDocument.body.style.padding = '0';
    printDocument.body.style.overflow = 'hidden';
    printDocument.documentElement.style.overflow = 'hidden';
  }

  return scale >= 0.999 ? 1 : scale;
}

export function centerMonthlyPrintPageVertically(
  pageRoot: HTMLElement,
  options: FitMonthlyPrintPageOptions = {}
): void {
  const printableHeightPx = options.printableHeightPx ?? mmToPx(MONTHLY_PRINTABLE_HEIGHT_MM);

  pageRoot.style.setProperty('--print-page-height', `${printableHeightPx}px`);
  pageRoot.style.minHeight = `${printableHeightPx}px`;
  pageRoot.style.maxHeight = `${printableHeightPx}px`;
  pageRoot.style.display = 'flex';
  pageRoot.style.flexDirection = 'column';
  pageRoot.style.justifyContent = 'center';
  pageRoot.style.paddingTop = '0';
  pageRoot.style.paddingBottom = '0';
}

export function layoutMonthlyPrintPage(
  pageRoot: HTMLElement,
  options: DistributeMonthlyPrintRowsOptions &
    FitMonthlyPrintPageOptions & { weekCount?: number } = {}
): { weekHeight: number; scale: number } {
  const printableHeightPx = options.printableHeightPx ?? mmToPx(MONTHLY_PRINTABLE_HEIGHT_MM);
  const safetyMargin = options.safetyMargin ?? MONTHLY_PRINT_LAYOUT_SAFETY_MARGIN;

  const weekHeight = distributeMonthlyPrintWeekHeights(pageRoot, options);
  let scale = fitMonthlyPrintPageToOnePage(pageRoot, options);
  const contentBlock = getPrintContentBlock(pageRoot);

  if (scale < 0.999) {
    const renderedHeight = pageRoot.getBoundingClientRect().height;

    if (renderedHeight > printableHeightPx * safetyMargin) {
      const currentZoom = Number.parseFloat(contentBlock.style.zoom || '1') || 1;
      scale =
        currentZoom * (printableHeightPx / renderedHeight) * (safetyMargin * 0.98);
      applyPrintZoom(contentBlock, scale);
    }
  }

  centerMonthlyPrintPageVertically(pageRoot, options);

  return { weekHeight, scale };
}

export function prepareMonthlyPrintFrameForLayout(iframe: HTMLIFrameElement): void {
  iframe.style.width = `${mmToPx(MONTHLY_PRINTABLE_WIDTH_MM)}px`;
  iframe.style.height = `${mmToPx(MONTHLY_PRINTABLE_HEIGHT_MM)}px`;
  iframe.style.visibility = 'hidden';
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.overflow = 'hidden';
}
