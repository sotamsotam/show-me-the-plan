/**
 * 모바일 주간 리스트(월~일)에서 오늘 날짜 행이 보이도록 세로 스크롤을 맞춘다.
 */
export function scrollListWeekToToday(calendarRoot: HTMLElement | null): void {
  if (!calendarRoot) {
    return;
  }

  const todayRow = calendarRoot.querySelector<HTMLElement>(
    '.fc-listWeek-view tr.fc-list-day.fc-day-today'
  );
  if (!todayRow) {
    return;
  }

  const scroller = todayRow.closest('.fc-scroller');
  if (!(scroller instanceof HTMLElement)) {
    return;
  }

  if (scroller.scrollHeight <= scroller.clientHeight + 1) {
    return;
  }

  const scrollerRect = scroller.getBoundingClientRect();
  const rowRect = todayRow.getBoundingClientRect();
  const nextScrollTop = Math.max(
    0,
    Math.min(
      scroller.scrollTop + (rowRect.top - scrollerRect.top),
      scroller.scrollHeight - scroller.clientHeight
    )
  );

  if (Math.abs(scroller.scrollTop - nextScrollTop) < 1) {
    return;
  }

  scroller.scrollTop = nextScrollTop;
}

export function scheduleScrollListWeekToToday(calendarRoot: HTMLElement | null): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollListWeekToToday(calendarRoot);
    });
  });
}
