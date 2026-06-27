'use client';

import { useCallback, useState } from 'react';

export function useWeeklyPlanTableColumnHover() {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const clearHoveredCol = useCallback(() => {
    setHoveredCol(null);
  }, []);

  const getColumnHoverHandlers = useCallback(
    (colIndex: number) => ({
      onMouseEnter: () => setHoveredCol(colIndex),
    }),
    []
  );

  const getColumnHoverClassName = useCallback(
    (colIndex: number) =>
      hoveredCol === colIndex ? 'exam-prep-weekly-plan-col-hover' : '',
    [hoveredCol]
  );

  return {
    clearHoveredCol,
    getColumnHoverHandlers,
    getColumnHoverClassName,
  };
}
