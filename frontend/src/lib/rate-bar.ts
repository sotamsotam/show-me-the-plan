export function formatRatePercent(rate: number | null): string {
  if (rate === null) {
    return '-';
  }

  return `${rate}%`;
}

export function getRateBarColor(rate: number): string {
  if (rate > 100) {
    return 'bg-green-700 dark:bg-green-800';
  }

  if (rate >= 100) {
    return 'bg-green-500 dark:bg-green-600';
  }

  if (rate >= 80) {
    return 'bg-green-500 dark:bg-green-600';
  }

  if (rate >= 50) {
    return 'bg-amber-500 dark:bg-amber-600';
  }

  if (rate > 0) {
    return 'bg-orange-500 dark:bg-orange-600';
  }

  return 'bg-red-400 dark:bg-red-500';
}
