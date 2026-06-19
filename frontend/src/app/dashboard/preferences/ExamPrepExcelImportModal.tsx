'use client';

import type { ExamPrepExcelImportPreview } from '@/lib/exam-prep-weekly-plan-excel';

interface ExamPrepExcelImportModalProps {
  open: boolean;
  fileName: string;
  roundLabel: string;
  preview: ExamPrepExcelImportPreview | null;
  parsing?: boolean;
  applying?: boolean;
  parseError?: string;
  actionError?: string;
  onClose: () => void;
  onApply: () => Promise<void>;
}

export default function ExamPrepExcelImportModal({
  open,
  fileName,
  roundLabel,
  preview,
  parsing = false,
  applying = false,
  parseError = '',
  actionError = '',
  onClose,
  onApply,
}: ExamPrepExcelImportModalProps) {
  if (!open) {
    return null;
  }

  const isBusy = parsing || applying;
  const canApply = Boolean(preview) && !parseError && !parsing;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(32rem,calc(100vh-2rem))] w-full max-w-lg flex-col rounded-xl border border-gray-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-prep-excel-import-title"
      >
        <div className="border-b border-gray-200 p-6 dark:border-neutral-700">
          <h2
            id="exam-prep-excel-import-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            엑셀파일 불러오기
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            선택한 파일을 현재 회차({roundLabel})에 적용합니다.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            파일: <span className="font-medium">{fileName}</span>
          </p>

          {parsing ? (
            <p className="mt-4 text-sm text-gray-500">파일을 읽는 중...</p>
          ) : parseError ? (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{parseError}</p>
          ) : preview ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-neutral-700 dark:bg-zinc-800/60">
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  {preview.weekCount}주차 · {preview.subjectCount}과목 · 내용{' '}
                  {preview.filledCellCount}칸
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  일치하는 주차·과목 셀은 덮어씁니다. 적용 후 수정하고 공부계획 저장을 눌러
                  주세요.
                </p>
              </div>

              {preview.warnings.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    확인이 필요한 항목
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-700 dark:text-amber-300">
                    {preview.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 p-6 dark:border-neutral-700">
          {actionError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-neutral-600"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => onApply()}
              disabled={!canApply || isBusy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {applying ? '적용 중...' : '적용'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
