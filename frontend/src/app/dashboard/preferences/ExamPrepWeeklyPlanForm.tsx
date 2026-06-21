'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import ExamPrepExcelImportModal from '@/app/dashboard/preferences/ExamPrepExcelImportModal';
import ExamPrepTemplateLoadModal from '@/app/dashboard/preferences/ExamPrepTemplateLoadModal';
import ExamPrepTemplateSaveModal from '@/app/dashboard/preferences/ExamPrepTemplateSaveModal';
import ExcelIcon from '@/components/ExcelIcon';
import { useStudentApi } from '@/hooks/useStudentApi';
import {
  resolveEffectiveExamRoundPreview,
  resolveExamPeriodSettings,
} from '@/lib/exam-period-settings';
import {
  createEmptyExamPrepWeeklyPlans,
  MAX_EXAM_PREP_WEEKLY_PLAN_CONTENT_LENGTH,
  resolveExamPrepWeeklyPlans,
  type ExamPrepWeeklyPlans,
  type ExamPrepWeeklyPlansContextResponse,
} from '@/lib/exam-prep-weekly-plan';
import {
  EXAM_ROUND_LABELS,
  EXAM_ROUND_SLOTS,
  getWeeksForSlot,
  formatPrepWeekLabel,
  listPrepWeekNumbers,
  resolveExamPrepWeeksByRound,
  resolveNearestScheduledRoundSlot,
  type ExamPrepWeeksByRound,
  type ExamRoundPreviewItem,
  type ExamRoundSlot,
} from '@/lib/exam-countdown';
import {
  applyTemplateToRound,
  countTemplateSubjectKeys,
  extractRoundToTemplateCreateInput,
  extractRoundToTemplateWeeks,
  getUnmatchedTemplateSubjectLabels,
  hasExamPrepRoundContent,
  resolveExamPrepWeeklyPlanTemplates,
  type ExamPrepWeeklyPlanTemplate,
  type ExamPrepWeeklyPlanTemplatesResponse,
  type ExamPrepWeeklyPlanTemplateSaveResponse,
} from '@/lib/exam-prep-weekly-plan-template';
import {
  applyExamPrepExcelImportToRound,
  exportExamPrepWeeklyPlanToExcel,
  parseExamPrepWeeklyPlanExcelFile,
  type ExamPrepExcelImportPreview,
  type ParseExamPrepExcelResult,
} from '@/lib/exam-prep-weekly-plan-excel';
import type { UserSubject } from '@/lib/user-subject';

function formatExamDateRange(firstDay: string, lastDay: string): string {
  const format = (ymd: string) =>
    `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;

  if (firstDay === lastDay) {
    return format(firstDay);
  }

  return `${format(firstDay)} ~ ${format(lastDay)}`;
}

function readWeekContent(
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot,
  weekNumber: number,
  subjectId: string
): string {
  return plans[roundSlot]?.weeks?.[String(weekNumber)]?.[subjectId] ?? '';
}

function writeWeekContent(
  plans: ExamPrepWeeklyPlans,
  roundSlot: ExamRoundSlot,
  weekNumber: number,
  subjectId: string,
  content: string
): ExamPrepWeeklyPlans {
  const weekKey = String(weekNumber);
  const roundPlan = plans[roundSlot] ?? { weeks: {} };
  const weekSubjects = { ...(roundPlan.weeks[weekKey] ?? {}) };

  if (content.trim()) {
    weekSubjects[subjectId] = content;
  } else {
    delete weekSubjects[subjectId];
  }

  const nextWeeks = { ...roundPlan.weeks };
  if (Object.keys(weekSubjects).length > 0) {
    nextWeeks[weekKey] = weekSubjects;
  } else {
    delete nextWeeks[weekKey];
  }

  const nextPlans = { ...plans };
  if (Object.keys(nextWeeks).length > 0) {
    nextPlans[roundSlot] = { weeks: nextWeeks };
  } else {
    delete nextPlans[roundSlot];
  }

  return nextPlans;
}

export default function ExamPrepWeeklyPlanForm() {
  const { withStudent, studentUserId } = useStudentApi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftPlans, setDraftPlans] = useState<ExamPrepWeeklyPlans>(
    createEmptyExamPrepWeeklyPlans()
  );
  const [examPrepWeeksByRound, setExamPrepWeeksByRound] = useState<ExamPrepWeeksByRound>(
    resolveExamPrepWeeksByRound(null)
  );
  const [examRoundPreview, setExamRoundPreview] = useState<ExamRoundPreviewItem[]>([]);
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [selectedRoundSlot, setSelectedRoundSlot] = useState<ExamRoundSlot>('sem1-r1');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [templates, setTemplates] = useState<ExamPrepWeeklyPlanTemplate[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesLoadingError, setTemplatesLoadingError] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaveError, setTemplateSaveError] = useState('');
  const [templateApplying, setTemplateApplying] = useState(false);
  const [templateDeletingId, setTemplateDeletingId] = useState<string | null>(null);
  const [templateActionError, setTemplateActionError] = useState('');
  const [excelExporting, setExcelExporting] = useState(false);
  const [excelImportModalOpen, setExcelImportModalOpen] = useState(false);
  const [excelImportFileName, setExcelImportFileName] = useState('');
  const [excelImportParsing, setExcelImportParsing] = useState(false);
  const [excelImportApplying, setExcelImportApplying] = useState(false);
  const [excelImportParseError, setExcelImportParseError] = useState('');
  const [excelImportActionError, setExcelImportActionError] = useState('');
  const [excelImportPreview, setExcelImportPreview] =
    useState<ExamPrepExcelImportPreview | null>(null);
  const [parsedExcelImport, setParsedExcelImport] =
    useState<ParseExamPrepExcelResult | null>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  const selectedPreview = useMemo(
    () =>
      examRoundPreview.find((item) => item.slot === selectedRoundSlot) ?? {
        slot: selectedRoundSlot,
        label: null,
        firstDay: null,
        lastDay: null,
        hasSchedule: false,
      },
    [examRoundPreview, selectedRoundSlot]
  );

  const weekNumbers = useMemo(
    () => listPrepWeekNumbers(getWeeksForSlot(selectedRoundSlot, examPrepWeeksByRound)),
    [examPrepWeeksByRound, selectedRoundSlot]
  );

  const currentWeekCount = useMemo(
    () => getWeeksForSlot(selectedRoundSlot, examPrepWeeksByRound),
    [examPrepWeeksByRound, selectedRoundSlot]
  );

  const currentRoundLabel = useMemo(
    () => selectedPreview.label ?? EXAM_ROUND_LABELS[selectedRoundSlot],
    [selectedPreview.label, selectedRoundSlot]
  );

  const currentRoundTemplateWeeks = useMemo(
    () =>
      extractRoundToTemplateWeeks(
        draftPlans,
        selectedRoundSlot,
        subjects,
        currentWeekCount
      ),
    [draftPlans, selectedRoundSlot, subjects, currentWeekCount]
  );

  const currentRoundSubjectCount = useMemo(
    () => countTemplateSubjectKeys(currentRoundTemplateWeeks),
    [currentRoundTemplateWeeks]
  );

  const canSaveTemplate = useMemo(
    () => hasExamPrepRoundContent(draftPlans, selectedRoundSlot),
    [draftPlans, selectedRoundSlot]
  );

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesLoadingError('');

    try {
      const res = await fetch(
        withStudent('/api/profile/exam-prep-weekly-plan-templates'),
        { credentials: 'include' }
      );
      const data = (await res.json()) as ExamPrepWeeklyPlanTemplatesResponse & {
        error?: string;
      };

      if (!res.ok) {
        setTemplatesLoadingError(
          data.error ?? '시험기간 공부계획 템플릿을 불러오지 못했습니다.'
        );
        return;
      }

      setTemplates(resolveExamPrepWeeklyPlanTemplates(data.examPrepWeeklyPlanTemplates));
    } catch {
      setTemplatesLoadingError('시험기간 공부계획 템플릿을 불러오지 못했습니다.');
    } finally {
      setTemplatesLoading(false);
    }
  }, [withStudent]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    setLoaded(false);

    try {
      const res = await fetch(withStudent('/api/profile/exam-prep-weekly-plans'), {
        credentials: 'include',
      });
      const data = (await res.json()) as ExamPrepWeeklyPlansContextResponse & {
        error?: string;
      };

      if (!res.ok) {
        const message =
          data.error === 'Forbidden'
            ? '주차별 공부계획 API 권한이 없습니다. 백엔드 서버를 재시작한 뒤 다시 시도해 주세요.'
            : (data.error ?? '주차별 공부계획을 불러오지 못했습니다.');
        setError(message);
        return;
      }

      const settings = resolveExamPrepWeeksByRound(
        data.examPrepWeeksByRound,
        data.examPrepWeeksBefore
      );
      const preview = resolveEffectiveExamRoundPreview(
        resolveExamPeriodSettings(data.examPeriodSettings),
        data.examRoundPreview ?? []
      );

      setExamPrepWeeksByRound(settings);
      setExamRoundPreview(preview);
      setSubjects(data.subjects ?? []);
      setDraftPlans(resolveExamPrepWeeklyPlans(data.examPrepWeeklyPlans));
      setSelectedRoundSlot(resolveNearestScheduledRoundSlot(preview));
      setLoaded(true);
    } catch {
      setError('주차별 공부계획을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [withStudent]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings, studentUserId]);

  useEffect(() => {
    if (!loadModalOpen) {
      return;
    }

    void loadTemplates();
  }, [loadModalOpen, loadTemplates, studentUserId]);

  function handleOpenSaveModal() {
    setTemplateSaveError('');
    setSaveModalOpen(true);
  }

  function handleOpenLoadModal() {
    setTemplateActionError('');
    setTemplatesLoadingError('');
    setLoadModalOpen(true);
  }

  function resetExcelImportState() {
    setExcelImportModalOpen(false);
    setExcelImportFileName('');
    setExcelImportParsing(false);
    setExcelImportApplying(false);
    setExcelImportParseError('');
    setExcelImportActionError('');
    setExcelImportPreview(null);
    setParsedExcelImport(null);
  }

  function handleOpenExcelImport() {
    resetExcelImportState();
    excelFileInputRef.current?.click();
  }

  async function handleExcelFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setExcelImportModalOpen(true);
    setExcelImportFileName(file.name);
    setExcelImportParsing(true);
    setExcelImportParseError('');
    setExcelImportActionError('');
    setExcelImportPreview(null);
    setParsedExcelImport(null);

    try {
      const parsed = await parseExamPrepWeeklyPlanExcelFile(
        file,
        subjects,
        currentWeekCount
      );

      setParsedExcelImport(parsed);

      if (!parsed.ok) {
        setExcelImportParseError(parsed.error ?? '엑셀 파일을 읽지 못했습니다.');
        setExcelImportPreview(parsed.preview ?? null);
        return;
      }

      setExcelImportPreview(parsed.preview ?? null);
    } catch {
      setExcelImportParseError('엑셀 파일을 읽지 못했습니다.');
    } finally {
      setExcelImportParsing(false);
    }
  }

  async function handleExportExcel() {
    setExcelExporting(true);
    setError('');
    setSuccess('');

    try {
      await exportExamPrepWeeklyPlanToExcel({
        roundLabel: currentRoundLabel,
        roundSlot: selectedRoundSlot,
        weekCount: currentWeekCount,
        subjects,
        plans: draftPlans,
      });
      setSuccess('엑셀 파일을보냈습니다.');
    } catch {
      setError('엑셀 파일보내기에 실패했습니다.');
    } finally {
      setExcelExporting(false);
    }
  }

  async function handleApplyExcelImport() {
    if (!parsedExcelImport?.ok || !parsedExcelImport.weeks) {
      return;
    }

    setExcelImportApplying(true);
    setExcelImportActionError('');

    const result = applyExamPrepExcelImportToRound(
      draftPlans,
      parsedExcelImport.weeks,
      selectedRoundSlot,
      subjects,
      currentWeekCount,
      parsedExcelImport.preview?.warnings ?? []
    );

    setDraftPlans(result.plans);
    resetExcelImportState();
    setExcelImportApplying(false);

    const unmatchedLabels = getUnmatchedTemplateSubjectLabels(result.skippedSubjectKeys);
    let message = '엑셀 파일이 적용되었습니다. 수정 후 공부계획 저장을 눌러 주세요.';

    if (unmatchedLabels.length > 0) {
      message += ` (${unmatchedLabels.join(', ')} 과목은 현재 프로필에 없어 제외됨)`;
    }

    if (result.warnings.length > 0) {
      message += ` (${result.warnings.length}개 항목 건너뜀)`;
    }

    setSuccess(message);
  }

  async function handleSaveTemplate(name: string) {
    setTemplateSaving(true);
    setTemplateSaveError('');

    const templateInput = extractRoundToTemplateCreateInput(
      name,
      draftPlans,
      selectedRoundSlot,
      subjects,
      currentWeekCount
    );

    if (!templateInput) {
      setTemplateSaveError('저장할 공부계획 내용이 없습니다.');
      setTemplateSaving(false);
      return;
    }

    try {
      const body: {
        name: string;
        weekCount: number;
        weeks: typeof templateInput.weeks;
        studentUserId?: number;
      } = {
        name: templateInput.name,
        weekCount: templateInput.weekCount,
        weeks: templateInput.weeks,
      };

      if (studentUserId) {
        body.studentUserId = studentUserId;
      }

      const res = await fetch('/api/profile/exam-prep-weekly-plan-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as ExamPrepWeeklyPlanTemplateSaveResponse & {
        error?: string;
      };

      if (!res.ok) {
        setTemplateSaveError(data.error ?? '템플릿 저장에 실패했습니다.');
        return;
      }

      setTemplates(resolveExamPrepWeeklyPlanTemplates(data.examPrepWeeklyPlanTemplates));
      setSaveModalOpen(false);
      setSuccess(`「${data.template.name}」 템플릿이 저장되었습니다.`);
    } catch {
      setTemplateSaveError('템플릿 저장에 실패했습니다.');
    } finally {
      setTemplateSaving(false);
    }
  }

  async function handleApplyTemplate(template: ExamPrepWeeklyPlanTemplate) {
    setTemplateApplying(true);
    setTemplateActionError('');

    const result = applyTemplateToRound(
      draftPlans,
      template,
      selectedRoundSlot,
      subjects,
      currentWeekCount,
      'overwrite'
    );

    setDraftPlans(result.plans);
    setLoadModalOpen(false);
    setTemplateApplying(false);

    const unmatchedLabels = getUnmatchedTemplateSubjectLabels(result.skippedSubjectKeys);
    let message = `「${template.name}」 템플릿이 적용되었습니다. 수정 후 공부계획 저장을 눌러 주세요.`;

    if (unmatchedLabels.length > 0) {
      message += ` (${unmatchedLabels.join(', ')} 과목은 현재 프로필에 없어 제외됨)`;
    }

    setSuccess(message);
  }

  async function handleDeleteTemplate(templateId: string) {
    setTemplateDeletingId(templateId);
    setTemplateActionError('');

    try {
      const res = await fetch(
        withStudent(`/api/profile/exam-prep-weekly-plan-templates/${templateId}`),
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      const data = (await res.json()) as ExamPrepWeeklyPlanTemplatesResponse & {
        error?: string;
      };

      if (!res.ok) {
        setTemplateActionError(data.error ?? '템플릿 삭제에 실패했습니다.');
        return;
      }

      setTemplates(resolveExamPrepWeeklyPlanTemplates(data.examPrepWeeklyPlanTemplates));
      setSuccess('템플릿이 삭제되었습니다.');
    } catch {
      setTemplateActionError('템플릿 삭제에 실패했습니다.');
    } finally {
      setTemplateDeletingId(null);
    }
  }

  function handleContentChange(
    weekNumber: number,
    subjectId: string,
    content: string
  ) {
    setDraftPlans((current) =>
      writeWeekContent(current, selectedRoundSlot, weekNumber, subjectId, content)
    );
    setSuccess('');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const body: {
        examPrepWeeklyPlans: ExamPrepWeeklyPlans;
        studentUserId?: number;
      } = {
        examPrepWeeklyPlans: draftPlans,
      };

      if (studentUserId) {
        body.studentUserId = studentUserId;
      }

      const res = await fetch('/api/profile/exam-prep-weekly-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '주차별 공부계획 저장에 실패했습니다.');
        return;
      }

      setDraftPlans(resolveExamPrepWeeklyPlans(data.examPrepWeeklyPlans));
      setSuccess('시험기간 주차별 공부계획이 저장되었습니다.');
    } catch {
      setError('주차별 공부계획 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-12">
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <section className="w-full space-y-4">
        <div>
          <h2 className="text-lg font-medium">시험기간 주차별 공부계획</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            회차별·주차별 공부 목표를 입력하면 스터디 플랜 캘린더에서 확인할 수 있습니다.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : (
            <p className="text-sm text-gray-500">데이터를 불러오지 못했습니다.</p>
          )}
          <button
            type="button"
            onClick={loadSettings}
            className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-zinc-800"
          >
            다시 시도
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="weekly-plan-settings-page w-full min-w-0 max-w-full space-y-4">
      <div className="shrink-0">
        <h2 className="text-lg font-medium">시험기간 주차별 공부계획</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          회차별·주차별 공부 목표를 입력하면 스터디 플랜 캘린더에서 확인할 수 있습니다.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="weekly-plan-form min-w-0 max-w-full overflow-x-clip space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900"
      >
        <div className="shrink-0 space-y-4">
          <div className="space-y-2">
          <label htmlFor="exam-prep-weekly-plan-round" className="block text-sm font-medium">
            시험 회차
          </label>
          <select
            id="exam-prep-weekly-plan-round"
            value={selectedRoundSlot}
            onChange={(event) => setSelectedRoundSlot(event.target.value as ExamRoundSlot)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
          >
            {EXAM_ROUND_SLOTS.map((slot) => {
              const preview =
                examRoundPreview.find((item) => item.slot === slot) ??
                ({
                  slot,
                  label: null,
                  firstDay: null,
                  lastDay: null,
                  hasSchedule: false,
                } satisfies ExamRoundPreviewItem);

              return (
                <option key={slot} value={slot} disabled={!preview.hasSchedule}>
                  {EXAM_ROUND_LABELS[slot]}
                  {preview.hasSchedule && preview.firstDay && preview.lastDay
                    ? ` (${formatExamDateRange(preview.firstDay, preview.lastDay)})`
                    : ' (시험 일정 없음)'}
                </option>
              );
            })}
          </select>
        </div>

        {selectedPreview.hasSchedule && selectedPreview.firstDay && selectedPreview.lastDay ? null : (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            선택한 회차의 시험 일정이 없어 공부계획을 입력할 수 없습니다.{' '}
            <Link href="/dashboard/preferences/exam-prep" className="underline">
              시험기간 설정
            </Link>
            에서 시험 시작일·종료일을 등록해 주세요.
          </p>
        )}

        {selectedPreview.hasSchedule && subjects.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleOpenLoadModal}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-zinc-800"
            >
              템플릿 불러오기
            </button>
            <button
              type="button"
              onClick={handleOpenSaveModal}
              disabled={!canSaveTemplate}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-zinc-800"
            >
              현재 회차를 템플릿으로 저장
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={excelExporting}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/60"
            >
              <ExcelIcon />
              {excelExporting ? '보내는 중...' : '엑셀파일로\u0020내보내기'}
            </button>
            <button
              type="button"
              onClick={handleOpenExcelImport}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/60"
            >
              <ExcelIcon />
              엑셀파일 불러오기
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '공부계획 저장'}
            </button>
            <input
              ref={excelFileInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="sr-only"
              onChange={handleExcelFileSelected}
            />
          </div>
        ) : null}

          {subjects.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              등록된 과목이 없습니다.{' '}
              <Link href="/dashboard/settings" className="underline">
                프로필 설정
              </Link>
              에서 과목을 먼저 등록해 주세요.
            </p>
          ) : null}
        </div>

        {subjects.length > 0 && selectedPreview.hasSchedule ? (
          <div className="weekly-plan-table-wrap">
            <div className="exam-prep-weekly-plan-table-shell rounded-lg border border-gray-200 dark:border-neutral-700">
              <div
                className="exam-prep-weekly-plan-table-scroll"
                tabIndex={0}
                aria-label="주차별 공부계획 표"
              >
                <table className="exam-prep-weekly-plan-table border-collapse text-sm dark:border-neutral-700">
                  <thead>
                    <tr className="bg-gray-50 text-left dark:bg-zinc-800/60">
                      <th className="exam-prep-weekly-plan-corner-cell min-w-[5.5rem] px-3 py-2 font-medium">
                        주차
                      </th>
                      {subjects.map((subject) => (
                        <th
                          key={subject.id}
                          className="w-[20rem] min-w-[20rem] px-3 py-2 font-medium"
                          title={subject.label}
                        >
                          <span className="line-clamp-2">{subject.label}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weekNumbers.map((weekNumber) => (
                      <tr key={weekNumber} className="align-top">
                        <th
                          scope="row"
                          className="exam-prep-weekly-plan-week-cell px-3 py-3 text-left font-medium text-gray-700 dark:text-gray-200"
                        >
                          {formatPrepWeekLabel(weekNumber)}
                        </th>
                        {subjects.map((subject) => {
                          const weekLabel = formatPrepWeekLabel(weekNumber);
                          const fieldId = `exam-prep-plan-${selectedRoundSlot}-${weekNumber}-${subject.id}`;

                          return (
                            <td
                              key={subject.id}
                              className="exam-prep-weekly-plan-subject-cell w-[20rem] min-w-[20rem] px-3 py-3"
                            >
                              <label htmlFor={fieldId} className="sr-only">
                                {weekLabel} {subject.label}
                              </label>
                              <textarea
                                id={fieldId}
                                value={readWeekContent(
                                  draftPlans,
                                  selectedRoundSlot,
                                  weekNumber,
                                  subject.id
                                )}
                                onChange={(event) =>
                                  handleContentChange(weekNumber, subject.id, event.target.value)
                                }
                                rows={4}
                                maxLength={MAX_EXAM_PREP_WEEKLY_PLAN_CONTENT_LENGTH}
                                placeholder="이번 주 공부 목표"
                                className="min-h-[7rem] w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {(error || success) && (
          <div className="shrink-0 space-y-2">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {success && (
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            )}
          </div>
        )}
      </form>

      <ExamPrepTemplateSaveModal
        open={saveModalOpen}
        onClose={() => {
          if (!templateSaving) {
            setSaveModalOpen(false);
            setTemplateSaveError('');
          }
        }}
        roundLabel={currentRoundLabel}
        weekCount={currentWeekCount}
        subjectCount={currentRoundSubjectCount}
        saving={templateSaving}
        error={templateSaveError}
        onSave={handleSaveTemplate}
      />

      <ExamPrepExcelImportModal
        open={excelImportModalOpen}
        fileName={excelImportFileName}
        roundLabel={currentRoundLabel}
        preview={excelImportPreview}
        parsing={excelImportParsing}
        applying={excelImportApplying}
        parseError={excelImportParseError}
        actionError={excelImportActionError}
        onClose={() => {
          if (!excelImportParsing && !excelImportApplying) {
            resetExcelImportState();
          }
        }}
        onApply={handleApplyExcelImport}
      />

      <ExamPrepTemplateLoadModal
        open={loadModalOpen}
        onClose={() => {
          if (!templateApplying && !templateDeletingId) {
            setLoadModalOpen(false);
            setTemplateActionError('');
          }
        }}
        roundLabel={currentRoundLabel}
        templates={templates}
        loading={templatesLoading}
        loadingError={templatesLoadingError}
        applying={templateApplying}
        deletingId={templateDeletingId}
        actionError={templateActionError}
        onApply={handleApplyTemplate}
        onDelete={handleDeleteTemplate}
      />
    </section>
  );
}
