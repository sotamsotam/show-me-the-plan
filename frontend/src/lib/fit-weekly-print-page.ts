export const A4_LANDSCAPE_WIDTH_MM = 297;
export const A4_LANDSCAPE_HEIGHT_MM = 210;
export const PRINT_PAGE_MARGIN_MM = 8;

export const PRINTABLE_WIDTH_MM = A4_LANDSCAPE_WIDTH_MM - PRINT_PAGE_MARGIN_MM * 2;
export const PRINTABLE_HEIGHT_MM = A4_LANDSCAPE_HEIGHT_MM - PRINT_PAGE_MARGIN_MM * 2;

/** 행 분배·최종 맞춤 시 인쇄 엔진 차이를 흡수 */
export const PRINT_LAYOUT_SAFETY_MARGIN = 0.94;

export type WeeklyPrintDensity = 'comfortable' | 'compact' | 'dense';

export function mmToPx(mm: number, dpi = 96): number {
  return (mm / 25.4) * dpi;
}

export function resolveWeeklyPrintDensity(bodyRowCount: number): WeeklyPrintDensity {
  if (bodyRowCount <= 8) {
    return 'comfortable';
  }

  if (bodyRowCount <= 14) {
    return 'compact';
  }

  return 'dense';
}

export function resolveWeeklyPrintBodyRowCount(
  timeRowCount: number,
  hasAllDayRow: boolean
): number {
  return timeRowCount + (hasAllDayRow ? 1 : 0);
}

export function resolvePrintTableRowCount(
  timeRowCount: number,
  hasAllDayRow: boolean
): number {
  const bodyRows = timeRowCount > 0 ? timeRowCount : 1;
  return 1 + (hasAllDayRow ? 1 : 0) + bodyRows;
}

export interface DistributeWeeklyPrintRowsOptions {
  printableHeightPx?: number;
  tableRowCount?: number;
  safetyMargin?: number;
}

export interface FitWeeklyPrintPageOptions {
  printableWidthPx?: number;
  printableHeightPx?: number;
  safetyMargin?: number;
}

export function calculateDistributedRowHeight(
  printableHeightPx: number,
  headerHeightPx: number,
  tableRowCount: number,
  safetyMargin = PRINT_LAYOUT_SAFETY_MARGIN
): number {
  if (tableRowCount <= 0) {
    return 0;
  }

  const borderAllowance = tableRowCount + 2;
  const availableHeight = Math.max(
    0,
    printableHeightPx * safetyMargin - headerHeightPx - borderAllowance
  );
  return availableHeight / tableRowCount;
}

export function calculatePrintOverflowScale(
  contentWidth: number,
  contentHeight: number,
  printableWidthPx: number,
  printableHeightPx: number,
  safetyMargin = PRINT_LAYOUT_SAFETY_MARGIN
): number {
  if (contentHeight <= 0 || contentWidth <= 0) {
    return 1;
  }

  const scale = Math.min(
    1,
    (printableHeightPx / contentHeight) * safetyMargin,
    (printableWidthPx / contentWidth) * safetyMargin
  );

  return scale >= 0.999 ? 1 : scale;
}

function getPrintContentBlock(pageRoot: HTMLElement): HTMLElement {
  return (pageRoot.querySelector('.weekly-print-document') as HTMLElement | null) ?? pageRoot;
}

function applyPrintZoom(targetElement: HTMLElement, scale: number): void {
  const style = targetElement.style;

  if (scale >= 0.999) {
    style.removeProperty('zoom');
    style.transform = '';
    style.transformOrigin = '';
    style.width = '';
    return;
  }

  if ('zoom' in document.documentElement.style) {
    style.setProperty('zoom', String(scale));
    style.transform = '';
    style.transformOrigin = '';
    style.width = '';
    return;
  }

  style.transformOrigin = 'top left';
  style.transform = `scale(${scale})`;
  style.width = `${100 / scale}%`;
}

function resetPrintLayoutStyles(pageRoot: HTMLElement): void {
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

  pageRoot.style.removeProperty('--print-row-height');
  pageRoot.style.removeProperty('--print-table-height');
}

function measureDocumentHeaderHeight(pageRoot: HTMLElement): number {
  const docHeader = pageRoot.querySelector('.weekly-print-header') as HTMLElement | null;
  if (!docHeader) {
    return 0;
  }

  const marginBottom = Number.parseFloat(
    pageRoot.ownerDocument.defaultView?.getComputedStyle(docHeader).marginBottom ?? '0'
  );

  return docHeader.offsetHeight + marginBottom;
}

export function distributeWeeklyPrintRowHeights(
  pageRoot: HTMLElement,
  options: DistributeWeeklyPrintRowsOptions = {}
): number {
  const printableHeightPx = options.printableHeightPx ?? mmToPx(PRINTABLE_HEIGHT_MM);
  const safetyMargin = options.safetyMargin ?? PRINT_LAYOUT_SAFETY_MARGIN;

  resetPrintLayoutStyles(pageRoot);

  const headerHeightPx = measureDocumentHeaderHeight(pageRoot);
  const tableRowCount =
    options.tableRowCount ??
    pageRoot.querySelectorAll(
      '.weekly-print-table thead tr, .weekly-print-table tbody tr'
    ).length;

  const rowHeight = calculateDistributedRowHeight(
    printableHeightPx,
    headerHeightPx,
    tableRowCount,
    safetyMargin
  );

  const tableHeight = rowHeight * tableRowCount;

  pageRoot.style.setProperty('--print-row-height', `${rowHeight}px`);
  pageRoot.style.setProperty('--print-table-height', `${tableHeight}px`);

  const printDocument = pageRoot.ownerDocument;
  if (printDocument?.body) {
    printDocument.body.style.margin = '0';
    printDocument.body.style.padding = '0';
    printDocument.body.style.overflow = 'hidden';
    printDocument.documentElement.style.overflow = 'hidden';
  }

  return rowHeight;
}

export function fitWeeklyPrintPageToOnePage(
  pageRoot: HTMLElement,
  options: FitWeeklyPrintPageOptions = {}
): number {
  const printableWidthPx = options.printableWidthPx ?? mmToPx(PRINTABLE_WIDTH_MM);
  const printableHeightPx = options.printableHeightPx ?? mmToPx(PRINTABLE_HEIGHT_MM);
  const safetyMargin = options.safetyMargin ?? PRINT_LAYOUT_SAFETY_MARGIN;
  const contentBlock = getPrintContentBlock(pageRoot);

  const scale = calculatePrintOverflowScale(
    pageRoot.scrollWidth,
    pageRoot.scrollHeight,
    printableWidthPx,
    printableHeightPx,
    safetyMargin
  );

  applyPrintZoom(contentBlock, scale);

  const printDocument = pageRoot.ownerDocument;
  if (printDocument?.body) {
    printDocument.body.style.margin = '0';
    printDocument.body.style.padding = '0';
    printDocument.body.style.overflow = 'hidden';
    printDocument.documentElement.style.overflow = 'hidden';
  }

  return scale;
}

export function centerWeeklyPrintPageVertically(
  pageRoot: HTMLElement,
  options: FitWeeklyPrintPageOptions = {}
): void {
  const printableHeightPx = options.printableHeightPx ?? mmToPx(PRINTABLE_HEIGHT_MM);

  pageRoot.style.setProperty('--print-page-height', `${printableHeightPx}px`);
  pageRoot.style.minHeight = `${printableHeightPx}px`;
  pageRoot.style.maxHeight = `${printableHeightPx}px`;
  pageRoot.style.display = 'flex';
  pageRoot.style.flexDirection = 'column';
  pageRoot.style.justifyContent = 'center';
  pageRoot.style.paddingTop = '0';
  pageRoot.style.paddingBottom = '0';
}

export function layoutWeeklyPrintPage(
  pageRoot: HTMLElement,
  options: DistributeWeeklyPrintRowsOptions & FitWeeklyPrintPageOptions = {}
): { rowHeight: number; scale: number } {
  const printableHeightPx = options.printableHeightPx ?? mmToPx(PRINTABLE_HEIGHT_MM);
  const safetyMargin = options.safetyMargin ?? PRINT_LAYOUT_SAFETY_MARGIN;

  const rowHeight = distributeWeeklyPrintRowHeights(pageRoot, options);
  let scale = fitWeeklyPrintPageToOnePage(pageRoot, options);
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

  centerWeeklyPrintPageVertically(pageRoot, options);

  return { rowHeight, scale };
}

export function preparePrintFrameForLayout(iframe: HTMLIFrameElement): void {
  iframe.style.width = `${mmToPx(PRINTABLE_WIDTH_MM)}px`;
  iframe.style.height = `${mmToPx(PRINTABLE_HEIGHT_MM)}px`;
  iframe.style.visibility = 'hidden';
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.overflow = 'hidden';
}
