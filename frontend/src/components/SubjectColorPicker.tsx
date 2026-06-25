'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { SUBJECT_COLOR_PRESETS } from '@/lib/subject-color-presets';
import { getSubjectAccentColor } from '@/lib/subject-color';
import type { LegacyStudyPlanSubject, ProfileSubjectsInput } from '@/lib/user-subject';

interface SubjectColorPickerProps {
  subjectId: string;
  category?: LegacyStudyPlanSubject;
  color?: string;
  subjects?: ProfileSubjectsInput;
  disabled?: boolean;
  onChange: (color: string | undefined) => void;
}

export default function SubjectColorPicker({
  subjectId,
  category,
  color,
  subjects,
  disabled = false,
  onChange,
}: SubjectColorPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const previewColor = color ?? getSubjectAccentColor(subjectId || category || 'other', subjects);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (!(target instanceof Node) || !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-label="과목 색상 선택"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 dark:border-neutral-600 dark:hover:bg-zinc-800"
      >
        <span
          className="h-5 w-5 rounded-full border border-black/10 dark:border-white/20"
          style={{ backgroundColor: previewColor }}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="과목 색상 팔레트"
          className="absolute left-0 top-full z-20 mt-1 w-[11.5rem] rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-zinc-900"
        >
          <div className="grid grid-cols-6 gap-1.5">
            {SUBJECT_COLOR_PRESETS.map((preset) => {
              const selected = (color ?? previewColor).toUpperCase() === preset.toUpperCase();
              return (
                <button
                  key={preset}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={`색상 ${preset}`}
                  title={preset}
                  onClick={() => {
                    onChange(preset);
                    setOpen(false);
                  }}
                  className={`h-6 w-6 rounded-md border transition-transform hover:scale-105 ${
                    selected
                      ? 'border-blue-600 ring-2 ring-blue-500/40 dark:border-blue-400'
                      : 'border-black/10 dark:border-white/15'
                  }`}
                  style={{ backgroundColor: preset }}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setOpen(false);
            }}
            className="mt-2 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-neutral-700 dark:text-gray-300 dark:hover:bg-zinc-800"
          >
            기본값으로 되돌리기
          </button>
        </div>
      ) : null}
    </div>
  );
}
