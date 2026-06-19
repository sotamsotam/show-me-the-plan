'use client';

import { fetchStudyPlanTodoTitles } from '@/lib/study-plan-todo-api';
import type { PlanSubjectKey } from '@/lib/user-subject';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

const MAX_SUGGESTIONS = 8;
const DEBOUNCE_MS = 200;

function rankTitleSuggestions(titles: string[], query: string): string[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return titles.slice(0, MAX_SUGGESTIONS);
  }

  const prefixMatches: string[] = [];
  const includesMatches: string[] = [];

  for (const title of titles) {
    if (title === trimmed) {
      continue;
    }

    if (title.startsWith(trimmed)) {
      prefixMatches.push(title);
    } else if (title.includes(trimmed)) {
      includesMatches.push(title);
    }
  }

  return [...prefixMatches, ...includesMatches].slice(0, MAX_SUGGESTIONS);
}

interface StudyPlanTitleComboboxProps {
  value: string;
  onChange: (value: string) => void;
  subject: PlanSubjectKey;
  withStudent: (path: string) => string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export default function StudyPlanTitleCombobox({
  value,
  onChange,
  subject,
  withStudent,
  required = false,
  placeholder = '예: 3단원 복습',
  disabled = false,
}: StudyPlanTitleComboboxProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchIdRef = useRef(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const loadSuggestions = useCallback(
    async (query: string) => {
      const trimmed = query.trim();

      if (!trimmed) {
        setSuggestions([]);
        setOpen(false);
        setActiveIndex(-1);
        return;
      }

      const fetchId = ++fetchIdRef.current;
      const result = await fetchStudyPlanTodoTitles(withStudent, {
        q: trimmed,
        subject,
      });

      if (fetchId !== fetchIdRef.current) {
        return;
      }

      if (!result.ok) {
        setSuggestions([]);
        setOpen(false);
        setActiveIndex(-1);
        return;
      }

      const nextSuggestions = rankTitleSuggestions(result.titles, trimmed);
      setSuggestions(nextSuggestions);
      setOpen(nextSuggestions.length > 0);
      setActiveIndex(nextSuggestions.length > 0 ? 0 : -1);
    },
    [subject, withStudent]
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void loadSuggestions(value);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, subject, loadSuggestions]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  function selectSuggestion(nextTitle: string) {
    onChange(nextTitle);
    setOpen(false);
    setActiveIndex(-1);
    setSuggestions([]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      if (suggestions.length === 0) {
        return;
      }

      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      if (suggestions.length === 0) {
        return;
      }

      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter' && open && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const activeDescendantId =
    open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        required={required}
        disabled={disabled}
        value={value}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendantId}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          if (suggestions.length > 0 && value.trim()) {
            setOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-zinc-800"
      />

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-neutral-600 dark:bg-zinc-800"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectSuggestion(suggestion)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === activeIndex
                  ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
