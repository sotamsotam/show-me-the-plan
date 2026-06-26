import { describe, expect, it } from 'vitest';
import {
  calculateDistributedRowHeight,
  calculatePrintOverflowScale,
  resolvePrintTableRowCount,
  resolveWeeklyPrintBodyRowCount,
  resolveWeeklyPrintDensity,
} from '@/lib/fit-weekly-print-page';

describe('fit-weekly-print-page', () => {
  it('resolves density tiers from body row count', () => {
    expect(resolveWeeklyPrintDensity(6)).toBe('comfortable');
    expect(resolveWeeklyPrintDensity(10)).toBe('compact');
    expect(resolveWeeklyPrintDensity(18)).toBe('dense');
  });

  it('counts all-day row in body row count', () => {
    expect(resolveWeeklyPrintBodyRowCount(5, true)).toBe(6);
    expect(resolveWeeklyPrintBodyRowCount(5, false)).toBe(5);
  });

  it('counts printable table rows including header and empty body row', () => {
    expect(resolvePrintTableRowCount(5, true)).toBe(7);
    expect(resolvePrintTableRowCount(0, false)).toBe(2);
  });

  it('distributes remaining height evenly across table rows', () => {
    const rowHeight = calculateDistributedRowHeight(700, 120, 7, 1);

    expect(rowHeight).toBeCloseTo((700 - 120 - 9) / 7, 2);
  });

  it('scales content down when rendered height exceeds printable area', () => {
    const scale = calculatePrintOverflowScale(800, 900, 800, 700, 1);

    expect(scale).toBeCloseTo(700 / 900, 3);
  });
});
