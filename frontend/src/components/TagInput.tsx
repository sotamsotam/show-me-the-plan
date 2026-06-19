'use client';

import { KeyboardEvent, useState } from 'react';
import {
  MAX_SUBJECT_TAG_LENGTH,
  MAX_SUBJECT_TAGS,
} from '@/lib/user-subject';
import { tryAddSubjectTag } from '@/lib/subject-tags';

interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  maxTagLength?: number;
  id?: string;
}

export default function TagInput({
  label,
  tags,
  onChange,
  placeholder = '태그 입력',
  disabled = false,
  maxTags = MAX_SUBJECT_TAGS,
  maxTagLength = MAX_SUBJECT_TAG_LENGTH,
  id,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');

  function addTag(rawValue: string) {
    const result = tryAddSubjectTag(tags, rawValue, maxTags, maxTagLength);

    if (!result.ok) {
      setInputError(result.message);
      return;
    }

    onChange([...tags, result.tag]);
    setInputValue('');
    setInputError('');
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, tagIndex) => tagIndex !== index));
    setInputError('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag(inputValue);
    }
  }

  const inputId = id ?? label;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {label}
        </label>
        <span className="text-xs text-gray-400">
          {tags.length}/{maxTags}
        </span>
      </div>

      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <li key={`${tag}-${index}`}>
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-800 dark:border-neutral-600 dark:bg-zinc-800 dark:text-gray-100">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  disabled={disabled}
                  aria-label={`${tag} 삭제`}
                  className="rounded-full px-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-40 dark:hover:bg-neutral-700 dark:hover:text-gray-100"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            if (inputError) {
              setInputError('');
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled || tags.length >= maxTags}
          placeholder={placeholder}
          maxLength={maxTagLength}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 disabled:opacity-60 dark:border-neutral-600 dark:bg-zinc-800"
        />
        <button
          type="button"
          onClick={() => addTag(inputValue)}
          disabled={disabled || tags.length >= maxTags || !inputValue.trim()}
          className="shrink-0 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-zinc-800"
        >
          추가
        </button>
      </div>

      {inputError && (
        <p className="text-xs text-red-600 dark:text-red-400">{inputError}</p>
      )}
    </div>
  );
}
