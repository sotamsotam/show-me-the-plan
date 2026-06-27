'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import RegularTemplateLoadModal from '@/app/dashboard/preferences/RegularTemplateLoadModal';
import RegularTemplateSaveModal from '@/app/dashboard/preferences/RegularTemplateSaveModal';
import WeeklyPlanItemList from '@/components/WeeklyPlanItemList';
import { useStudentApi } from '@/hooks/useStudentApi';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { useStudyPlanTodosInRange } from '@/hooks/useStudyPlanTodosInRange';
import { useWeeklyPlanTableColumnHover } from '@/hooks/useWeeklyPlanTableColumnHover';
import { buildTodoByIdMap } from '@/lib/exam-prep-weekly-plan-item-display';
import { todayYmdLocal } from '@/lib/exam-countdown';
import { resolveNearestRegularPeriodKey, type RegularPeriodSegmentPreviewItem } from '@/lib/regular-period-segments';
import {
  applyTemplateToPeriod,
  countTemplateSubjectKeys,
  extractPeriodToTemplateCreateInput,
  extractPeriodToTemplateWeeks,
  getUnmatchedTemplateSubjectLabels,
  hasRegularPeriodContent,
  resolveRegularWeeklyPlanTemplates,
  type RegularWeeklyPlanTemplate,
  type RegularWeeklyPlanTemplatesResponse,
  type RegularWeeklyPlanTemplateSaveResponse,
} from '@/lib/regular-weekly-plan-template';
import {
  areRegularWeeklyPlansEqual,
  createEmptyRegularWeeklyPlans,
  getRegularWeeklyPlanItems,
  previewItemToRegularPeriodFromPreview,
  resolveRegularWeeklyPlans,
  resolveStudyPlanTodoQueryRangeForRegular,
  writeRegularWeeklyPlanItemsForCell,
  type RegularWeeklyPlanItem,
  type RegularWeeklyPlans,
  type RegularWeeklyPlansContextResponse,
} from '@/lib/regular-weekly-plan';
import {
  formatVacationWeekRange,
  listVacationWeekNumbers,
  resolveVacationWeekDateRange,
} from '@/lib/vacation-week-date-range';
import type { UserSubject } from '@/lib/user-subject';

const UNSAVED_REGULAR_WEEKLY_PLAN_MESSAGE =
  '작성내용이 저장되지 않았습니다. 저장하시려면 공부계획 저장 버튼을 눌러주세요. 저장 없이 이동하시겠습니까?';
const EXAM_SETTINGS_HREF = '/dashboard/preferences/exam-prep';
const VACATION_SETTINGS_HREF = '/dashboard/preferences/vacation-period';

const REGULAR_DATA_MISSING_MESSAGE = (
  <>
    평소 기간을 계산할 수 없습니다.{' '}
    <Link href={VACATION_SETTINGS_HREF} className="underline">
      방학기간 설정
    </Link>
    과{' '}
    <Link href={EXAM_SETTINGS_HREF} className="underline">
      시험기간 설정
    </Link>
    을 먼저 입력해 주세요.
  </>
);

function formatRegularDateRange(start: string, end: string): string {
  return formatVacationWeekRange(start, end);
}

function readWeekItems(
  plans: RegularWeeklyPlans,
  periodKey: string,
  weekNumber: number,
  subjectId: string
): RegularWeeklyPlanItem[] {
  return getRegularWeeklyPlanItems(plans, periodKey, weekNumber, subjectId);
}

function writeWeekItems(
  plans: RegularWeeklyPlans,
  periodKey: string,
  weekNumber: number,
  subjectId: string,
  items: RegularWeeklyPlanItem[]
): RegularWeeklyPlans {
  return writeRegularWeeklyPlanItemsForCell(plans, periodKey, weekNumber, subjectId, items);
}

export default function RegularWeeklyPlanForm() {
  const { withStudent, studentUserId } = useStudentApi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftPlans, setDraftPlans] = useState<RegularWeeklyPlans>(
    createEmptyRegularWeeklyPlans()
  );
  const [savedPlans, setSavedPlans] = useState<RegularWeeklyPlans>(
    createEmptyRegularWeeklyPlans()
  );
  const [regularPeriodPreview, setRegularPeriodPreview] = useState<
    RegularPeriodSegmentPreviewItem[]
  >([]);
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [templates, setTemplates] = useState<RegularWeeklyPlanTemplate[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesLoadingError, setTemplatesLoadingError] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaveError, setTemplateSaveError] = useState('');
  const [templateApplying, setTemplateApplying] = useState(false);
  const [templateDeletingId, setTemplateDeletingId] = useState<string | null>(null);
  const [templateActionError, setTemplateActionError] = useState('');

  const selectedPreview = useMemo(
    () =>
      regularPeriodPreview.find((item) => item.periodKey === selectedPeriodKey) ?? null,
    [selectedPeriodKey, regularPeriodPreview]
  );

  const weekNumbers = useMemo(() => {
    if (!selectedPreview) {
      return [];
    }

    return listVacationWeekNumbers(previewItemToRegularPeriodFromPreview(selectedPreview));
  }, [selectedPreview]);

  const weekRanges = useMemo(() => {
    if (!selectedPreview) {
      return new Map<number, string>();
    }

    const period = previewItemToRegularPeriodFromPreview(selectedPreview);
    const ranges = new Map<number, string>();

    for (const weekNumber of weekNumbers) {
      const range = resolveVacationWeekDateRange(period, weekNumber);
      if (range) {
        ranges.set(weekNumber, formatVacationWeekRange(range.start, range.end));
      }
    }

    return ranges;
  }, [selectedPreview, weekNumbers]);

  const currentWeekCount = selectedPreview?.weekCount ?? 0;

  const currentPeriodLabel = useMemo(
    () =>
      selectedPreview
        ? `${selectedPreview.label} (${formatRegularDateRange(selectedPreview.start, selectedPreview.end)})`
        : selectedPeriodKey,
    [selectedPreview, selectedPeriodKey]
  );

  const currentPeriodTemplateWeeks = useMemo(
    () =>
      selectedPreview
        ? extractPeriodToTemplateWeeks(
            draftPlans,
            selectedPeriodKey,
            subjects,
            currentWeekCount
          )
        : {},
    [draftPlans, selectedPeriodKey, subjects, currentWeekCount, selectedPreview]
  );

  const currentPeriodSubjectCount = useMemo(
    () => countTemplateSubjectKeys(currentPeriodTemplateWeeks),
    [currentPeriodTemplateWeeks]
  );

  const canSaveTemplate = useMemo(
    () => hasRegularPeriodContent(draftPlans, selectedPeriodKey),
    [draftPlans, selectedPeriodKey]
  );

  const studyPlanTodoQueryRange = useMemo(
    () => resolveStudyPlanTodoQueryRangeForRegular(regularPeriodPreview),
    [regularPeriodPreview]
  );

  const { todos: studyPlanTodos, refetch: refetchStudyPlanTodos } = useStudyPlanTodosInRange({
    start: studyPlanTodoQueryRange?.start ?? '',
    end: studyPlanTodoQueryRange?.end ?? '',
    enabled: loaded && studyPlanTodoQueryRange !== null,
  });

  const todoById = useMemo(() => buildTodoByIdMap(studyPlanTodos), [studyPlanTodos]);
  const { clearHoveredCol, getColumnHoverHandlers, getColumnHoverClassName } =
    useWeeklyPlanTableColumnHover();

  useEffect(() => {
    if (!loaded) {
      return;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void refetchStudyPlanTodos(true);
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loaded, refetchStudyPlanTodos]);

  const hasUnsavedChanges = useMemo(
    () => loaded && !areRegularWeeklyPlansEqual(savedPlans, draftPlans),
    [draftPlans, loaded, savedPlans]
  );

  useUnsavedChangesWarning(hasUnsavedChanges, UNSAVED_REGULAR_WEEKLY_PLAN_MESSAGE);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesLoadingError('');

    try {
      const res = await fetch(
        withStudent('/api/profile/regular-weekly-plan-templates'),
        { credentials: 'include' }
      );
      const data = (await res.json()) as RegularWeeklyPlanTemplatesResponse & {
        error?: string;
      };

      if (!res.ok) {
        setTemplatesLoadingError(
          data.error ?? '평소기간 공부계획 템플릿을 불러오지 못했습니다.'
        );
        return;
      }

      setTemplates(resolveRegularWeeklyPlanTemplates(data.regularWeeklyPlanTemplates));
    } catch {
      setTemplatesLoadingError('평소기간 공부계획 템플릿을 불러오지 못했습니다.');
    } finally {
      setTemplatesLoading(false);
    }
  }, [withStudent]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    setLoaded(false);

    try {
      const res = await fetch(withStudent('/api/profile/regular-weekly-plans'), {
        credentials: 'include',
      });
      const data = (await res.json()) as RegularWeeklyPlansContextResponse & {
        error?: string;
      };

      if (!res.ok) {
        const message =
          data.error === 'Forbidden'
            ? '평소기간 주차별 공부계획 API 권한이 없습니다. 백엔드 서버를 재시작한 뒤 다시 시도해 주세요.'
            : (data.error ?? '평소기간 주차별 공부계획을 불러오지 못했습니다.');
        setError(message);
        return;
      }

      const preview = data.regularPeriodPreview ?? [];

      const plans = resolveRegularWeeklyPlans(data.regularWeeklyPlans);
      setRegularPeriodPreview(preview);
      setSubjects(data.subjects ?? []);
      setDraftPlans(plans);
      setSavedPlans(plans);
      setSelectedPeriodKey(
        resolveNearestRegularPeriodKey(preview, todayYmdLocal()) ?? preview[0]?.periodKey ?? ''
      );
      setLoaded(true);
    } catch {
      setError('평소기간 주차별 공부계획을 불러오지 못했습니다.');
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

  async function handleSaveTemplate(name: string) {
    if (!selectedPreview) {
      return;
    }

    setTemplateSaving(true);
    setTemplateSaveError('');

    const templateInput = extractPeriodToTemplateCreateInput(
      name,
      draftPlans,
      selectedPeriodKey,
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

      const res = await fetch('/api/profile/regular-weekly-plan-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as RegularWeeklyPlanTemplateSaveResponse & {
        error?: string;
      };

      if (!res.ok) {
        setTemplateSaveError(data.error ?? '템플릿 저장에 실패했습니다.');
        return;
      }

      setTemplates(resolveRegularWeeklyPlanTemplates(data.regularWeeklyPlanTemplates));
      setSaveModalOpen(false);
      setSuccess(`「${data.template.name}」 템플릿이 저장되었습니다.`);
    } catch {
      setTemplateSaveError('템플릿 저장에 실패했습니다.');
    } finally {
      setTemplateSaving(false);
    }
  }

  async function handleApplyTemplate(template: RegularWeeklyPlanTemplate) {
    setTemplateApplying(true);
    setTemplateActionError('');

    const result = applyTemplateToPeriod(
      draftPlans,
      template,
      selectedPeriodKey,
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
        withStudent(`/api/profile/regular-weekly-plan-templates/${templateId}`),
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      const data = (await res.json()) as RegularWeeklyPlanTemplatesResponse & {
        error?: string;
      };

      if (!res.ok) {
        setTemplateActionError(data.error ?? '템플릿 삭제에 실패했습니다.');
        return;
      }

      setTemplates(resolveRegularWeeklyPlanTemplates(data.regularWeeklyPlanTemplates));
      setSuccess('템플릿이 삭제되었습니다.');
    } catch {
      setTemplateActionError('템플릿 삭제에 실패했습니다.');
    } finally {
      setTemplateDeletingId(null);
    }
  }

  function handleItemsChange(
    weekNumber: number,
    subjectId: string,
    items: RegularWeeklyPlanItem[]
  ) {
    if (!selectedPeriodKey) {
      return;
    }

    setDraftPlans((current) =>
      writeWeekItems(current, selectedPeriodKey, weekNumber, subjectId, items)
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
        regularWeeklyPlans: RegularWeeklyPlans;
        studentUserId?: number;
      } = {
        regularWeeklyPlans: draftPlans,
      };

      if (studentUserId) {
        body.studentUserId = studentUserId;
      }

      const res = await fetch('/api/profile/regular-weekly-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '평소기간 주차별 공부계획 저장에 실패했습니다.');
        return;
      }

      setDraftPlans(resolveRegularWeeklyPlans(data.regularWeeklyPlans));
      setSavedPlans(resolveRegularWeeklyPlans(data.regularWeeklyPlans));
      setSuccess('평소기간 주차별 공부계획이 저장되었습니다.');
    } catch {
      setError('평소기간 주차별 공부계획 저장에 실패했습니다.');
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
          <h2 className="text-lg font-medium text-white">평소기간 주차별 공부계획</h2>
          <p className="mt-1 text-sm text-[#e2feff]">
            평소 기간별·주차별 공부 목표를 입력하면 스터디 플랜 캘린더에서 확인할 수 있습니다.
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

  const hasRegularSchedule = regularPeriodPreview.length > 0;

  return (
    <section className="weekly-plan-settings-page w-full min-w-0 max-w-full space-y-4">
      <div className="shrink-0">
          <h2 className="text-lg font-medium text-white">평소기간 주차별 공부계획</h2>
          <p className="mt-1 text-sm text-[#e2feff]">
            평소 기간별·주차별 공부 목표를 입력하면 스터디 플랜 캘린더에서 확인할 수 있습니다.
          </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="weekly-plan-form min-w-0 max-w-full overflow-x-clip space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900"
      >
        {!hasRegularSchedule ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">{REGULAR_DATA_MISSING_MESSAGE}</p>
        ) : (
          <>
            <div className="shrink-0 space-y-4">
              <div className="space-y-2">
                <label htmlFor="regular-weekly-plan-period" className="block text-sm font-medium">
                  평소 기간
                </label>
                <select
                  id="regular-weekly-plan-period"
                  value={selectedPeriodKey}
                  onChange={(event) => setSelectedPeriodKey(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
                >
                  {regularPeriodPreview.map((preview) => (
                    <option key={preview.periodKey} value={preview.periodKey}>
                      {preview.label} ({formatRegularDateRange(preview.start, preview.end)})
                    </option>
                  ))}
                </select>
              </div>

              {subjects.length === 0 ? (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  등록된 과목이 없습니다.{' '}
                  <Link href="/dashboard/settings" className="underline">
                    프로필 설정
                  </Link>
                  에서 과목을 먼저 등록해 주세요.
                </p>
              ) : null}

              {selectedPreview && subjects.length > 0 ? (
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
                    현재 평소 기간을 템플릿으로 저장
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? '저장 중...' : '공부계획 저장'}
                  </button>
                </div>
              ) : null}
            </div>

            {subjects.length > 0 && selectedPreview ? (
              <div className="weekly-plan-table-wrap">
                <div className="exam-prep-weekly-plan-table-shell rounded-lg border border-gray-200 dark:border-neutral-700">
                  <div
                    className="exam-prep-weekly-plan-table-scroll"
                    tabIndex={0}
                    aria-label="주차별 공부계획 표"
                    onMouseLeave={clearHoveredCol}
                  >
                    <table className="exam-prep-weekly-plan-table text-sm dark:border-neutral-700">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-zinc-800/60">
                          <th
                            className={`exam-prep-weekly-plan-corner-cell min-w-[10rem] px-3 py-2 font-medium ${getColumnHoverClassName(0)}`}
                            {...getColumnHoverHandlers(0)}
                          >
                            기간
                          </th>
                          {subjects.map((subject, subjectIndex) => {
                            const colIndex = subjectIndex + 1;

                            return (
                            <th
                              key={subject.id}
                              className={`w-[20rem] min-w-[20rem] px-3 py-2 font-medium ${getColumnHoverClassName(colIndex)}`}
                              title={subject.label}
                              {...getColumnHoverHandlers(colIndex)}
                            >
                              <span className="line-clamp-2">{subject.label}</span>
                            </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {weekNumbers.map((weekNumber) => (
                          <tr key={weekNumber} className="align-top">
                            <th
                              scope="row"
                              className={`exam-prep-weekly-plan-week-cell px-3 py-3 text-left font-medium text-gray-700 dark:text-gray-200 ${getColumnHoverClassName(0)}`}
                              {...getColumnHoverHandlers(0)}
                            >
                              {weekRanges.get(weekNumber) ?? ''}
                            </th>
                            {subjects.map((subject, subjectIndex) => {
                              const colIndex = subjectIndex + 1;
                              const weekRangeLabel = weekRanges.get(weekNumber) ?? '';
                              const fieldId = `regular-plan-${selectedPeriodKey}-${weekNumber}-${subject.id}`;

                              return (
                                <td
                                  key={subject.id}
                                  className={`exam-prep-weekly-plan-subject-cell w-[20rem] min-w-[20rem] px-3 py-3 ${getColumnHoverClassName(colIndex)}`}
                                  {...getColumnHoverHandlers(colIndex)}
                                >
                                  <label htmlFor={fieldId} className="sr-only">
                                    {weekRangeLabel} {subject.label}
                                  </label>
                                  <WeeklyPlanItemList
                                    inputId={fieldId}
                                    inputLabel={`${weekRangeLabel} ${subject.label}`}
                                    items={readWeekItems(
                                      draftPlans,
                                      selectedPeriodKey,
                                      weekNumber,
                                      subject.id
                                    )}
                                    todoById={todoById}
                                    onChange={(items) =>
                                      handleItemsChange(weekNumber, subject.id, items)
                                    }
                                    textbooks={subject.textbooks}
                                    studyMethods={subject.studyMethods}
                                    placeholder="이번 주 공부 항목"
                                    disabled={saving}
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
          </>
        )}

        {(error || success) && (
          <div className="shrink-0 space-y-2">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {success && (
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            )}
          </div>
        )}
      </form>

      <RegularTemplateSaveModal
        open={saveModalOpen}
        onClose={() => {
          if (!templateSaving) {
            setSaveModalOpen(false);
            setTemplateSaveError('');
          }
        }}
        periodLabel={currentPeriodLabel}
        weekCount={currentWeekCount}
        subjectCount={currentPeriodSubjectCount}
        saving={templateSaving}
        error={templateSaveError}
        onSave={handleSaveTemplate}
      />

      <RegularTemplateLoadModal
        open={loadModalOpen}
        onClose={() => {
          if (!templateApplying && !templateDeletingId) {
            setLoadModalOpen(false);
            setTemplateActionError('');
          }
        }}
        periodLabel={currentPeriodLabel}
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
