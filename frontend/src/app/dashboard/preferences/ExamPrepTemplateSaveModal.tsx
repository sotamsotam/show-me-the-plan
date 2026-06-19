'use client';

import { FormEvent, useEffect, useState } from 'react';
import { MAX_EXAM_PREP_WEEKLY_PLAN_TEMPLATE_NAME_LENGTH } from '@/lib/exam-prep-weekly-plan-template';

interface ExamPrepTemplateSaveModalProps {
  open: boolean;
  onClose: () => void;
  roundLabel: string;
  weekCount: number;
  subjectCount: number;
  saving?: boolean;
  error?: string;
  onSave: (name: string) => Promise<void>;
}

export default function ExamPrepTemplateSaveModal({
  open,
  onClose,
  roundLabel,
  weekCount,
  subjectCount,
  saving = false,
  error = '',
  onSave,
}: ExamPrepTemplateSaveModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSave(name);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-prep-template-save-title"
      >
        <h2
          id="exam-prep-template-save-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          템플릿으로 저장
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          현재 선택한 회차({roundLabel}) · {weekCount}주 · {subjectCount}개 과목 내용이
          저장됩니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="exam-prep-template-name" className="block text-sm font-medium">
              템플릿 제목
            </label>
            <input
              id="exam-prep-template-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_EXAM_PREP_WEEKLY_PLAN_TEMPLATE_NAME_LENGTH}
              placeholder="예: 중간고사 4주 표준"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
              autoFocus
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-neutral-600"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
