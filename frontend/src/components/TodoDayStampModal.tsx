'use client';

import { FormEvent, useEffect, useState } from 'react';
import ResponsiveOverlay from '@/components/ResponsiveOverlay';
import TodoDayStampVisual from '@/components/TodoDayStampVisual';
import {
  TODO_DAY_STAMP_DEFAULT_MESSAGE,
  TODO_DAY_STAMP_MAX_MESSAGE_LENGTH,
  countTodoDayStampCharacters,
  validateTodoDayStampMessage,
} from '@/lib/todo-day-stamp';
import { trimTodoDayStampMessage } from '@/lib/todo-day-stamp-helpers';

interface TodoDayStampModalProps {
  open: boolean;
  date: string;
  initialMessage?: string;
  studentUserId: number;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (message: string) => Promise<void>;
}

export default function TodoDayStampModal({
  open,
  date,
  initialMessage,
  studentUserId,
  saving = false,
  onClose,
  onConfirm,
}: TodoDayStampModalProps) {
  const [message, setMessage] = useState(TODO_DAY_STAMP_DEFAULT_MESSAGE);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setMessage(initialMessage?.trim() || TODO_DAY_STAMP_DEFAULT_MESSAGE);
    setError('');
  }, [initialMessage, open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    const validationError = validateTodoDayStampMessage(message);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await onConfirm(message.trim());
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : '확인도장 저장에 실패했습니다.'
      );
    }
  }

  const characterCount = countTodoDayStampCharacters(message);

  return (
    <ResponsiveOverlay
      open={open}
      onClose={onClose}
      title="확인도장"
      mobileVariant="sheet"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {date} 학생 TODO에 찍을 도장 문구를 입력하세요. (최대{' '}
          {TODO_DAY_STAMP_MAX_MESSAGE_LENGTH}자, 길면 줄바꿈)
        </p>

        <div className="flex justify-center">
          <TodoDayStampVisual message={message.trim() || ' '} variant="preview" />
        </div>

        <div>
          <label
            htmlFor={`todo-day-stamp-message-${studentUserId}`}
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            도장 문구
          </label>
          <input
            id={`todo-day-stamp-message-${studentUserId}`}
            type="text"
            value={message}
            maxLength={TODO_DAY_STAMP_MAX_MESSAGE_LENGTH}
            onChange={(event) => {
              setMessage(trimTodoDayStampMessage(event.target.value));
              setError('');
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-neutral-600 dark:bg-zinc-900 dark:text-gray-100"
            placeholder={TODO_DAY_STAMP_DEFAULT_MESSAGE}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {characterCount}/{TODO_DAY_STAMP_MAX_MESSAGE_LENGTH}자
          </p>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-neutral-600 dark:text-gray-200 dark:hover:bg-zinc-800"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? '저장 중...' : '확인'}
          </button>
        </div>
      </form>
    </ResponsiveOverlay>
  );
}
