import type { CSSProperties } from 'react';
import type { MonthlyPrintGrid, MonthlyPrintSpanSegment } from '@/lib/monthly-schedule-print';

interface MonthlySchedulePrintViewProps {
  grid: MonthlyPrintGrid;
  userName: string;
}

function MonthPrintDayEvents({ events }: { events: MonthlyPrintGrid['weeks'][number]['days'][number]['events'] }) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="monthly-print-day-events">
      {events.map((event) => (
        <div
          key={event.eventId}
          className="monthly-print-day-event"
          style={{
            backgroundColor: event.backgroundColor,
            borderLeftColor: event.accentColor,
          }}
        >
          <span className="monthly-print-day-event-title">{event.title}</span>
        </div>
      ))}
    </div>
  );
}

function MonthPrintSpanLayer({
  segments,
  laneCount,
}: {
  segments: MonthlyPrintSpanSegment[];
  laneCount: number;
}) {
  if (segments.length === 0) {
    return null;
  }

  return (
    <div
      className="monthly-print-span-layer"
      style={{ '--print-span-lane-count': laneCount } as CSSProperties}
    >
      {segments.map((segment) => (
        <div
          key={segment.eventId}
          className={
            segment.continuesFromPriorWeek && segment.continuesToNextWeek
              ? 'monthly-print-span monthly-print-span--middle'
              : segment.continuesFromPriorWeek
                ? 'monthly-print-span monthly-print-span--end'
                : segment.continuesToNextWeek
                  ? 'monthly-print-span monthly-print-span--start'
                  : 'monthly-print-span'
          }
          style={{
            gridColumn: `${segment.colStart + 1} / span ${segment.colSpan}`,
            gridRow: segment.lane + 1,
            backgroundColor: segment.backgroundColor,
            borderLeftColor: segment.accentColor,
          }}
        >
          <span className="monthly-print-span-title">{segment.title}</span>
        </div>
      ))}
    </div>
  );
}

export default function MonthlySchedulePrintView({ grid, userName }: MonthlySchedulePrintViewProps) {
  const layoutStyle = {
    '--print-week-count': grid.weekCount,
  } as CSSProperties;

  return (
    <div
      className="monthly-print-page"
      data-density={grid.printDensity}
      style={layoutStyle}
    >
      <div className="monthly-print-document">
        <header className="monthly-print-header">
          <p className="monthly-print-range">{grid.rangeLabel}</p>
          <p className="monthly-print-title">월간 일정표</p>
          <p className="monthly-print-name">이름: {userName}</p>
        </header>

        <div className="monthly-print-calendar">
          <div className="monthly-print-weekday-row">
            {grid.weekdayLabels.map((label, index) => (
              <div
                key={label}
                className={
                  index === 6
                    ? 'monthly-print-weekday monthly-print-weekday--sunday'
                    : 'monthly-print-weekday'
                }
              >
                {label}
              </div>
            ))}
          </div>

          {grid.weeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="monthly-print-week-block">
              <MonthPrintSpanLayer
                segments={week.spanSegments}
                laneCount={week.spanLaneCount}
              />
              <div className="monthly-print-day-row">
                {week.days.map((day) => (
                  <div
                    key={day.date}
                    className={
                      day.isCurrentMonth
                        ? day.isSunday
                          ? 'monthly-print-day monthly-print-day--current monthly-print-day--sunday'
                          : 'monthly-print-day monthly-print-day--current'
                        : day.isSunday
                          ? 'monthly-print-day monthly-print-day--outside monthly-print-day--sunday'
                          : 'monthly-print-day monthly-print-day--outside'
                    }
                  >
                    <div className="monthly-print-day-number">{day.dayNumber}</div>
                    <MonthPrintDayEvents events={day.events} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
