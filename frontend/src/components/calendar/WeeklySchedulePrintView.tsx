import type { CSSProperties } from 'react';
import type { WeeklyPrintCellItem, WeeklyPrintGrid } from '@/lib/weekly-schedule-print';

interface WeeklySchedulePrintViewProps {
  grid: WeeklyPrintGrid;
  userName: string;
}

function PrintCheckbox({ item }: { item: WeeklyPrintCellItem }) {
  if (!item.showCheckbox) {
    return null;
  }

  return (
    <span className="weekly-print-checkbox" aria-hidden="true">
      {item.checked ? '☑' : '☐'}
    </span>
  );
}

function PrintCellItems({
  items,
  useItemBackground,
}: {
  items: WeeklyPrintCellItem[];
  useItemBackground: boolean;
}) {
  return (
    <div className="weekly-print-cell-items">
      {items.map((item) => (
        <div
          key={item.eventId}
          className="weekly-print-cell-item"
          style={useItemBackground ? { backgroundColor: item.backgroundColor } : undefined}
        >
          <PrintCheckbox item={item} />
          <span className="weekly-print-cell-title">{item.title}</span>
        </div>
      ))}
    </div>
  );
}

function resolveAllDayCellBackground(items: WeeklyPrintCellItem[]): string | undefined {
  return items.length === 1 ? items[0].backgroundColor : undefined;
}

function isCellCoveredByRowspan(
  column: WeeklyPrintGrid['dayColumns'][number],
  rowIndex: number
): boolean {
  for (let index = 0; index < rowIndex; index += 1) {
    const placement = column.rows[index];
    if (placement && index + placement.rowspan > rowIndex) {
      return true;
    }
  }

  return false;
}

export default function WeeklySchedulePrintView({ grid, userName }: WeeklySchedulePrintViewProps) {
  const rowCount = grid.timeRows.length;
  const layoutStyle = {
    '--print-body-row-count': grid.bodyRowCount,
    '--print-time-row-count': grid.timeRows.length,
    '--print-table-row-count': grid.tableRowCount,
  } as CSSProperties;

  return (
    <div
      className="weekly-print-page"
      data-density={grid.printDensity}
      data-has-allday={grid.hasAllDayRow ? 'true' : 'false'}
      style={layoutStyle}
    >
      <div className="weekly-print-document">
        <header className="weekly-print-header">
          <p className="weekly-print-range">{grid.rangeLabel}</p>
          <p className="weekly-print-title">주간계획표</p>
          <p className="weekly-print-name">이름: {userName}</p>
        </header>

        <table className="weekly-print-table">
          <thead>
            <tr className="weekly-print-table-header-row">
              <th className="weekly-print-corner">날짜/시간</th>
              {grid.dayColumns.map((column) => (
                <th
                  key={column.date}
                  className={
                    column.isSunday
                      ? 'weekly-print-day-header weekly-print-sunday'
                      : 'weekly-print-day-header'
                  }
                >
                  {column.headerLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.hasAllDayRow ? (
              <tr className="weekly-print-allday-row">
                <th className="weekly-print-time-label">{grid.allDayRowLabel}</th>
                {grid.dayColumns.map((column) => {
                  const allDayBackground = resolveAllDayCellBackground(column.allDayItems);

                  return (
                    <td
                      key={`${column.date}-allday`}
                      className={
                        allDayBackground
                          ? 'weekly-print-cell weekly-print-cell--filled'
                          : 'weekly-print-cell'
                      }
                      style={
                        allDayBackground ? { backgroundColor: allDayBackground } : undefined
                      }
                    >
                      {column.allDayItems.length > 0 ? (
                        <PrintCellItems
                          items={column.allDayItems}
                          useItemBackground={!allDayBackground}
                        />
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ) : null}

            {rowCount === 0 ? (
              <tr>
                <td className="weekly-print-empty" colSpan={8}>
                  {grid.isEmpty ? '이번 주에 표시할 일정이 없습니다.' : '표시할 시간 일정이 없습니다.'}
                </td>
              </tr>
            ) : (
              grid.timeRows.map((row, rowIndex) => (
                <tr key={`${row.startMinutes}-${row.endMinutes}`} className="weekly-print-time-row">
                  <th className="weekly-print-time-label">{row.label}</th>
                  {grid.dayColumns.map((column) => {
                    if (isCellCoveredByRowspan(column, rowIndex)) {
                      return null;
                    }

                    const placement = column.rows[rowIndex];
                    if (!placement) {
                      return <td key={`${column.date}-${rowIndex}`} className="weekly-print-cell" />;
                    }

                    const useCellBackground = Boolean(placement.backgroundColor);

                    return (
                      <td
                        key={`${column.date}-${rowIndex}`}
                        className={
                          useCellBackground
                            ? 'weekly-print-cell weekly-print-cell--filled'
                            : 'weekly-print-cell'
                        }
                        style={
                          placement.backgroundColor
                            ? { backgroundColor: placement.backgroundColor }
                            : undefined
                        }
                        rowSpan={placement.rowspan > 1 ? placement.rowspan : undefined}
                      >
                        <PrintCellItems
                          items={placement.items}
                          useItemBackground={!useCellBackground}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
