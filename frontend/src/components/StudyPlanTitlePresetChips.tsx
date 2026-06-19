'use client';

interface StudyPlanTitlePresetChipsProps {
  textbooks: string[];
  studyMethods: string[];
  selectedTextbook: string | null;
  selectedStudyMethod: string | null;
  rangeSuffix: string;
  onSelectTextbook: (textbook: string | null) => void;
  onSelectStudyMethod: (method: string | null) => void;
  onRangeChange: (range: string) => void;
  disabled?: boolean;
}

function PresetChipGroup({
  label,
  items,
  selected,
  onSelect,
  disabled,
}: {
  label: string;
  items: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  disabled?: boolean;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
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

export default function StudyPlanTitlePresetChips({
  textbooks,
  studyMethods,
  selectedTextbook,
  selectedStudyMethod,
  rangeSuffix,
  onSelectTextbook,
  onSelectStudyMethod,
  onRangeChange,
  disabled = false,
}: StudyPlanTitlePresetChipsProps) {
  if (textbooks.length === 0 && studyMethods.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-3 dark:border-neutral-700 dark:bg-zinc-800/40">
      <PresetChipGroup
        label="교재명"
        items={textbooks}
        selected={selectedTextbook}
        onSelect={onSelectTextbook}
        disabled={disabled}
      />
      <PresetChipGroup
        label="공부방법"
        items={studyMethods}
        selected={selectedStudyMethod}
        onSelect={onSelectStudyMethod}
        disabled={disabled}
      />
      {(textbooks.length > 0 || studyMethods.length > 0) && (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            범위 (선택)
          </span>
          <input
            type="text"
            value={rangeSuffix}
            onChange={(event) => onRangeChange(event.target.value)}
            disabled={disabled}
            placeholder="예: 1과 - 2과"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
          />
        </label>
      )}
    </div>
  );
}
