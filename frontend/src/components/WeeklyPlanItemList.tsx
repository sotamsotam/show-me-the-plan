'use client';



import { ClipboardEvent, DragEvent, KeyboardEvent, useMemo, useState } from 'react';

import ExecutionStatusCheckbox from '@/components/ExecutionStatusCheckbox';

import {
  appendWeeklyPlanItemsFromTitles,
  getUnscheduledWeeklyPlanItems,
  isScheduledWeeklyPlanItem,
  MAX_WEEKLY_PLAN_ITEMS_PER_CELL,
  MAX_WEEKLY_PLAN_ITEM_TITLE_LENGTH,
  parseWeeklyPlanItemTitlesFromMultilineText,
  type WeeklyPlanItem,
} from '@/lib/weekly-plan-item';

import {

  removeUnscheduledWeeklyPlanItem,

  reorderUnscheduledWeeklyPlanItems,

  resolveWeeklyPlanItemRowKind,

  getWeeklyPlanItemRowSurfaceClasses,

  type WeeklyPlanItemRowKind,

} from '@/lib/exam-prep-weekly-plan-item-display';

import {

  composeStudyPlanTitle,

  createEmptyStudyPlanTitleParts,

  type StudyPlanTitleParts,

} from '@/lib/study-plan-title-builder';

import type { StudyPlanTodo } from '@/lib/study-plan-todo';



export interface WeeklyPlanItemListProps {

  items: WeeklyPlanItem[];

  onChange: (unscheduledItems: WeeklyPlanItem[]) => void;

  todoById?: ReadonlyMap<number, StudyPlanTodo>;

  placeholder?: string;

  disabled?: boolean;

  inputId?: string;

  inputLabel?: string;

  textbooks?: string[];

  studyMethods?: string[];

}



function PresetChipRow({

  label,

  items,

  selected,

  disabled,

  onSelect,

}: {

  label: string;

  items: string[];

  selected: string | null;

  disabled?: boolean;

  onSelect: (value: string | null) => void;

}) {

  if (items.length === 0) {

    return null;

  }



  return (

    <div className="space-y-1">

      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>

      <div className="flex flex-wrap gap-1.5">

        {items.map((item) => {

          const isSelected = selected === item;



          return (

            <button

              key={item}

              type="button"

              disabled={disabled}

              onClick={() => onSelect(isSelected ? null : item)}

              className={`rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ${

                isSelected

                  ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100'

                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-neutral-600 dark:bg-zinc-800 dark:text-gray-200 dark:hover:bg-zinc-700'

              }`}

            >

              {item}

            </button>

          );

        })}

      </div>

    </div>

  );

}



function inputValueFromTitleParts(parts: StudyPlanTitleParts): string {

  return composeStudyPlanTitle({ ...parts, rangeSuffix: '' });

}



function ScheduledPendingIcon() {

  return (

    <svg

      xmlns="http://www.w3.org/2000/svg"

      viewBox="0 0 20 20"

      fill="none"

      stroke="currentColor"

      strokeWidth="1.5"

      className="h-4 w-4 shrink-0 self-start pt-0.5 text-blue-600 dark:text-blue-400"

      role="img"

      aria-label="캘린더에 배치됨"

    >

      <rect x="3" y="4" width="14" height="13" rx="2" />

      <path d="M3 8h14" strokeLinecap="round" />

      <path d="M7 2.5v3M13 2.5v3" strokeLinecap="round" />

    </svg>

  );

}



function WeeklyPlanItemStatusIcon({ kind }: { kind: WeeklyPlanItemRowKind }) {

  if (kind === 'editable') {

    return null;

  }



  if (kind === 'scheduled_pending') {

    return <ScheduledPendingIcon />;

  }



  return <ExecutionStatusCheckbox status={kind} size="xs" className="self-start pt-0.5" />;

}



function emitUnscheduledChange(

  allItems: WeeklyPlanItem[],

  onChange: WeeklyPlanItemListProps['onChange']

) {

  onChange(getUnscheduledWeeklyPlanItems(allItems));

}



export default function WeeklyPlanItemList({

  items,

  onChange,

  todoById,

  placeholder = '공부 항목 추가',

  disabled = false,

  inputId,

  inputLabel,

  textbooks = [],

  studyMethods = [],

}: WeeklyPlanItemListProps) {

  const [inputValue, setInputValue] = useState('');

  const [titleParts, setTitleParts] = useState(createEmptyStudyPlanTitleParts());

  const [inputError, setInputError] = useState('');

  const [dragUnscheduledIndex, setDragUnscheduledIndex] = useState<number | null>(null);



  const todoLookup = todoById ?? new Map<number, StudyPlanTodo>();



  const unscheduledIndexByItemId = useMemo(() => {

    const map = new Map<string, number>();

    let index = 0;



    for (const item of items) {

      if (!isScheduledWeeklyPlanItem(item)) {

        map.set(item.id, index);

        index += 1;

      }

    }



    return map;

  }, [items]);



  function applyAllItems(nextItems: WeeklyPlanItem[], error?: string) {

    emitUnscheduledChange(nextItems, onChange);

    setInputError(error ?? '');

  }



  function resetDraftFields() {

    setInputValue('');

    setTitleParts(createEmptyStudyPlanTitleParts());

  }



  function addTitles(titles: string[]) {

    const result = appendWeeklyPlanItemsFromTitles(items, titles);

    if ('error' in result) {

      setInputError(result.error);

      return;

    }



    applyAllItems(result.items);

    resetDraftFields();

  }



  function addItem() {

    addTitles([inputValue]);

  }



  function handleSelectTextbook(textbook: string | null) {

    const nextParts: StudyPlanTitleParts = {

      ...titleParts,

      selectedTextbook: textbook,

    };

    setTitleParts(nextParts);

    setInputValue(inputValueFromTitleParts(nextParts));

    if (inputError) {

      setInputError('');

    }

  }



  function handleSelectStudyMethod(studyMethod: string | null) {

    const nextParts: StudyPlanTitleParts = {

      ...titleParts,

      selectedStudyMethod: studyMethod,

    };

    setTitleParts(nextParts);

    setInputValue(inputValueFromTitleParts(nextParts));

    if (inputError) {

      setInputError('');

    }

  }



  function removeItem(itemId: string) {

    applyAllItems(removeUnscheduledWeeklyPlanItem(items, itemId));

  }



  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {

    if (event.key === 'Enter') {

      event.preventDefault();

      addItem();

    }

  }



  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {

    const pastedText = event.clipboardData.getData('text');

    const titles = parseWeeklyPlanItemTitlesFromMultilineText(pastedText);



    if (titles.length <= 1) {

      return;

    }



    event.preventDefault();

    addTitles(titles);

  }



  function handleDragStart(unscheduledIndex: number) {

    if (disabled) {

      return;

    }



    setDragUnscheduledIndex(unscheduledIndex);

  }



  function handleDragOver(event: DragEvent<HTMLLIElement>, unscheduledIndex: number) {

    event.preventDefault();



    if (

      dragUnscheduledIndex === null ||

      dragUnscheduledIndex === unscheduledIndex ||

      disabled

    ) {

      return;

    }



    applyAllItems(

      reorderUnscheduledWeeklyPlanItems(items, dragUnscheduledIndex, unscheduledIndex)

    );

    setDragUnscheduledIndex(unscheduledIndex);

  }



  function handleDragEnd() {

    setDragUnscheduledIndex(null);

  }



  const atCapacity = items.length >= MAX_WEEKLY_PLAN_ITEMS_PER_CELL;

  const showPresets = textbooks.length > 0 || studyMethods.length > 0;

  const canAddDraft = inputValue.trim().length > 0;



  return (

    <div className="weekly-plan-item-list space-y-2">

      {items.length > 0 ? (

        <ul className="space-y-1.5">

          {items.map((item) => {

            const rowKind = resolveWeeklyPlanItemRowKind(item, todoLookup);

            const isEditable = rowKind === 'editable';

            const unscheduledIndex = unscheduledIndexByItemId.get(item.id) ?? -1;



            return (

              <li

                key={item.id}

                draggable={isEditable && !disabled}

                onDragStart={() => {

                  if (unscheduledIndex >= 0) {

                    handleDragStart(unscheduledIndex);

                  }

                }}

                onDragOver={(event) => {

                  if (unscheduledIndex >= 0) {

                    handleDragOver(event, unscheduledIndex);

                  }

                }}

                onDragEnd={handleDragEnd}

                className={`flex items-start gap-2 rounded-md border px-2 py-1.5 text-sm ${getWeeklyPlanItemRowSurfaceClasses(rowKind)} ${
                  dragUnscheduledIndex === unscheduledIndex
                    ? 'ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-zinc-900'
                    : ''
                }`}

              >

                {isEditable ? (

                  <span

                    aria-hidden

                    className="cursor-grab select-none pt-0.5 text-gray-400 active:cursor-grabbing"

                    title="드래그해 순서 변경"

                  >

                    ≡

                  </span>

                ) : (

                  <span aria-hidden className="w-3 shrink-0" />

                )}

                <span className="min-w-0 flex-1 break-words text-gray-800 dark:text-gray-100">

                  {item.title}

                </span>

                {isEditable ? (

                  <button

                    type="button"

                    onClick={() => removeItem(item.id)}

                    disabled={disabled}

                    aria-label={`${item.title} 삭제`}

                    className="shrink-0 rounded px-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-40 dark:hover:bg-neutral-700 dark:hover:text-gray-100"

                  >

                    ×

                  </button>

                ) : (

                  <WeeklyPlanItemStatusIcon kind={rowKind} />

                )}

              </li>

            );

          })}

        </ul>

      ) : null}



      <div className="flex gap-2">

        <input

          id={inputId}

          type="text"

          value={inputValue}

          onChange={(event) => {

            setInputValue(event.target.value);

            if (showPresets) {

              setTitleParts(createEmptyStudyPlanTitleParts());

            }

            if (inputError) {

              setInputError('');

            }

          }}

          onKeyDown={handleKeyDown}

          onPaste={handlePaste}

          disabled={disabled || atCapacity}

          placeholder={placeholder}

          maxLength={MAX_WEEKLY_PLAN_ITEM_TITLE_LENGTH}

          aria-label={inputLabel ?? placeholder}

          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 disabled:opacity-60 dark:border-neutral-700 dark:bg-zinc-800"

        />

        <button

          type="button"

          onClick={() => addItem()}

          disabled={disabled || atCapacity || !canAddDraft}

          className="shrink-0 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-zinc-800"

        >

          추가

        </button>

      </div>



      {showPresets ? (

        <div className="space-y-2 rounded-lg border border-dashed border-gray-200 bg-white p-2 dark:border-neutral-700 dark:bg-white">

          <PresetChipRow

            label="교재명"

            items={textbooks}

            selected={titleParts.selectedTextbook}

            disabled={disabled || atCapacity}

            onSelect={handleSelectTextbook}

          />

          <PresetChipRow

            label="공부방법"

            items={studyMethods}

            selected={titleParts.selectedStudyMethod}

            disabled={disabled || atCapacity}

            onSelect={handleSelectStudyMethod}

          />

        </div>

      ) : null}



      {inputError ? (

        <p className="text-xs text-red-600 dark:text-red-400">{inputError}</p>

      ) : null}

    </div>

  );

}


