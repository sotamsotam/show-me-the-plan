'use client';

import { useEffect, useState } from 'react';
import {
  countTemplateSubjectKeys,
  countTemplateWeeksWithContent,
  type ExamPrepWeeklyPlanTemplate,
} from '@/lib/exam-prep-weekly-plan-template';

interface ExamPrepTemplateLoadModalProps {
  open: boolean;
  onClose: () => void;
  roundLabel: string;
  templates: ExamPrepWeeklyPlanTemplate[];
  loading?: boolean;
  loadingError?: string;
  applying?: boolean;
  deletingId?: string | null;
  actionError?: string;
  onApply: (template: ExamPrepWeeklyPlanTemplate) => Promise<void>;
  onDelete: (templateId: string) => Promise<void>;
}

function formatTemplateSavedAt(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso.slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
}

export default function ExamPrepTemplateLoadModal({
  open,
  onClose,
  roundLabel,
  templates,
  loading = false,
  loadingError = '',
  applying = false,
  deletingId = null,
  actionError = '',
  onApply,
  onDelete,
}: ExamPrepTemplateLoadModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedTemplateId(null);
      setPendingDeleteId(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? null;
  const isBusy = applying || Boolean(deletingId);

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
        aria-labelledby="exam-prep-template-load-title"
      >
        <div className="border-b border-gray-200 p-6 dark:border-neutral-700">
          <h2
            id="exam-prep-template-load-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            템플릿 불러오기
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            저장된 템플릿을 현재 회차({roundLabel})에 적용합니다.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : loadingError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{loadingError}</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              저장된 템플릿이 없습니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {templates.map((template) => {
                const isSelected = selectedTemplateId === template.id;
                const weekCount = countTemplateWeeksWithContent(template.weeks);
                const subjectCount = countTemplateSubjectKeys(template.weeks);

                return (
                  <li key={template.id}>
                    <div
                      className={`rounded-lg border p-3 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30'
                          : 'border-gray-200 dark:border-neutral-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(template.id);
                          setPendingDeleteId(null);
                        }}
                        disabled={isBusy}
                        className="w-full text-left"
                      >
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {template.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {template.weekCount}주 · {subjectCount}과목 ·{' '}
                          {formatTemplateSavedAt(template.createdAt)} 저장
                          {weekCount > 0 ? ` · 내용 ${weekCount}주차` : ''}
                        </p>
                      </button>

                      <div className="mt-2 flex justify-end">
                        {pendingDeleteId === template.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              정말 삭제하시겠습니까?
                            </span>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              disabled={isBusy}
                              className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-neutral-600"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(template.id)}
                              disabled={isBusy}
                              className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 dark:border-red-900"
                            >
                              {deletingId === template.id ? '삭제 중...' : '삭제'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setPendingDeleteId(template.id);
                              setSelectedTemplateId(template.id);
                            }}
                            disabled={isBusy}
                            className="text-xs text-red-600 hover:underline dark:text-red-400"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {selectedTemplate ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-neutral-700 dark:bg-zinc-800/60">
              <p className="text-sm text-gray-700 dark:text-gray-200">
                「{selectedTemplate.name}」을 현재 회차({roundLabel})에 적용합니다.
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                기존 내용은 덮어씁니다. 적용 후 수정하고 공부계획 저장을 눌러 주세요.
              </p>
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
              닫기
            </button>
            {selectedTemplate ? (
              <button
                type="button"
                onClick={() => onApply(selectedTemplate)}
                disabled={isBusy}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {applying ? '적용 중...' : '적용'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
