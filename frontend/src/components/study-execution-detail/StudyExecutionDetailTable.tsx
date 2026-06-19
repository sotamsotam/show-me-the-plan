'use client';

import { useMemo, useState } from 'react';
import AchievementLevelBar from '@/components/AchievementLevelBar';
import ExecutionRateBar from '@/components/ExecutionRateBar';
import ExecutionStatusCheckbox from '@/components/ExecutionStatusCheckbox';
import {
  DEFAULT_STUDY_EXECUTION_DETAIL_SORT_DIRECTION,
  DEFAULT_STUDY_EXECUTION_DETAIL_SORT_KEY,
  formatExecutionDateLabel,
  sortStudyExecutionDetailSubjectGroups,
  type StudyExecutionDetailSortDirection,
  type StudyExecutionDetailSortKey,
  type StudyExecutionDetailSubjectGroup,
} from '@/lib/study-execution-detail';

interface StudyExecutionDetailTableProps {
  subjectGroups: StudyExecutionDetailSubjectGroup[];
}

const TABLE_HEADER_CLASS =
  'border border-gray-300 bg-gray-50 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:border-neutral-600 dark:bg-zinc-800 dark:text-gray-100';
const TABLE_CELL_CLASS =
  'border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-neutral-600 dark:text-gray-100';

interface SortableHeaderProps {
  label: string;
  sortKey: StudyExecutionDetailSortKey;
  activeSortKey: StudyExecutionDetailSortKey;
  sortDirection: StudyExecutionDetailSortDirection;
  onSort: (sortKey: StudyExecutionDetailSortKey) => void;
  className?: string;
}

function SortArrowIcon({
  direction,
  active,
}: {
  direction: 'up' | 'down';
  active: boolean;
}) {
  const path = direction === 'up' ? 'M4 0 0 5h8L4 0z' : 'M4 5 0 0h8L4 5z';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 8 5"
      fill="currentColor"
      className={`h-2 w-2 ${
        active
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-gray-300 dark:text-gray-600'
      }`}
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = activeSortKey === sortKey;

  return (
    <th className={className ?? TABLE_HEADER_CLASS}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex w-full items-center justify-center gap-1 hover:text-blue-700 dark:hover:text-blue-300"
        aria-label={`${label} 정렬`}
        aria-sort={
          isActive
            ? sortDirection === 'asc'
              ? 'ascending'
              : 'descending'
            : 'none'
        }
      >
        <span>{label}</span>
        <span className="inline-flex shrink-0 flex-col gap-px leading-none">
          <SortArrowIcon direction="up" active={isActive && sortDirection === 'asc'} />
          <SortArrowIcon direction="down" active={isActive && sortDirection === 'desc'} />
        </span>
      </button>
    </th>
  );
}

export default function StudyExecutionDetailTable({
  subjectGroups,
}: StudyExecutionDetailTableProps) {
  const [sortKey, setSortKey] = useState<StudyExecutionDetailSortKey>(
    DEFAULT_STUDY_EXECUTION_DETAIL_SORT_KEY
  );
  const [sortDirection, setSortDirection] = useState<StudyExecutionDetailSortDirection>(
    DEFAULT_STUDY_EXECUTION_DETAIL_SORT_DIRECTION
  );

  function handleSort(nextSortKey: StudyExecutionDetailSortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection('asc');
  }

  const sortedSubjectGroups = useMemo(
    () => sortStudyExecutionDetailSubjectGroups(subjectGroups, sortKey, sortDirection),
    [subjectGroups, sortKey, sortDirection]
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr>
            <th className={`${TABLE_HEADER_CLASS} w-[88px]`}>과목</th>
            <SortableHeader
              label="내역"
              sortKey="title"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className={`${TABLE_HEADER_CLASS} min-w-[140px]`}
            />
            <th className={`${TABLE_HEADER_CLASS} w-[80px]`}>실행여부</th>
            <th className={`${TABLE_HEADER_CLASS} w-[120px]`}>실행률</th>
            <SortableHeader
              label="성취도"
              sortKey="achievementRate"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className={`${TABLE_HEADER_CLASS} w-[120px]`}
            />
            <SortableHeader
              label="실행일"
              sortKey="executionDate"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className={`${TABLE_HEADER_CLASS} w-[100px]`}
            />
          </tr>
        </thead>
        <tbody>
          {sortedSubjectGroups.map((group) =>
            group.rows.map((row, rowIndex) => (
              <tr key={row.eventId} className="bg-white dark:bg-zinc-900">
                {rowIndex === 0 && (
                  <td
                    rowSpan={group.rows.length}
                    className={`${TABLE_CELL_CLASS} align-middle text-center font-medium`}
                  >
                    {group.subjectLabel}
                  </td>
                )}
                <td className={`${TABLE_CELL_CLASS} text-left`}>{row.title}</td>
                <td className={`${TABLE_CELL_CLASS} text-center`}>
                  <div className="flex justify-center">
                    <ExecutionStatusCheckbox status={row.executionStatus} size="sm" />
                  </div>
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <ExecutionRateBar rate={row.executionRate} className="mx-0 max-w-none" />
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <AchievementLevelBar rate={row.achievementRate} className="mx-0 max-w-none" />
                </td>
                <td className={`${TABLE_CELL_CLASS} text-center tabular-nums`}>
                  {formatExecutionDateLabel(row.executionDate)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
