'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import SubjectColorPicker from '@/components/SubjectColorPicker';
import { useProfileSubjectsContext } from '@/contexts/ProfileSubjectsContext';
import type { UserSubject } from '@/lib/user-subject';

interface ProfileSubjectsSectionProps {
  refreshKey?: number;
}

function cloneSubjects(subjects: UserSubject[]): UserSubject[] {
  return subjects.map((subject) => ({
    ...subject,
    textbooks: subject.textbooks ? [...subject.textbooks] : undefined,
    studyMethods: subject.studyMethods ? [...subject.studyMethods] : undefined,
  }));
}

export default function ProfileSubjectsSection({
  refreshKey = 0,
}: ProfileSubjectsSectionProps) {
  const { subjects, loading, error: loadError, reload } = useProfileSubjectsContext();
  const [draftSubjects, setDraftSubjects] = useState<UserSubject[]>([]);
  const [newSubjectLabel, setNewSubjectLabel] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    reload();
  }, [refreshKey, reload]);

  useEffect(() => {
    setDraftSubjects(cloneSubjects(subjects));
  }, [subjects]);

  function updateSubjectLabel(index: number, label: string) {
    setDraftSubjects((prev) =>
      prev.map((subject, subjectIndex) =>
        subjectIndex === index ? { ...subject, label } : subject
      )
    );
  }

  function updateSubjectColor(index: number, color: string | undefined) {
    setDraftSubjects((prev) =>
      prev.map((subject, subjectIndex) => {
        if (subjectIndex !== index) {
          return subject;
        }

        if (!color) {
          const { color: _removed, ...rest } = subject;
          return rest;
        }

        return { ...subject, color };
      })
    );
  }

  function moveSubject(index: number, direction: -1 | 1) {
    setDraftSubjects((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function removeSubject(index: number) {
    if (draftSubjects.length <= 1) {
      return;
    }

    setDraftSubjects((prev) => prev.filter((_, subjectIndex) => subjectIndex !== index));
  }

  function handleAddSubject() {
    const label = newSubjectLabel.trim();
    if (!label) {
      return;
    }

    setDraftSubjects((prev) => [
      ...prev,
      {
        id: '',
        label,
        source: 'custom',
      },
    ]);
    setNewSubjectLabel('');
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaveError('');
    setSaveSuccess('');

    const trimmedSubjects = draftSubjects.map((subject) => ({
      ...subject,
      label: subject.label.trim(),
    }));

    if (trimmedSubjects.some((subject) => !subject.label)) {
      setSaveError('모든 과목명을 입력해 주세요.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/profile/subjects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subjects: trimmedSubjects }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error ?? '과목 설정 저장에 실패했습니다.');
        return;
      }

      setDraftSubjects(cloneSubjects(data.subjects ?? trimmedSubjects));
      setSaveSuccess('과목 설정이 저장되었습니다.');
      await reload();
    } catch {
      setSaveError('과목 설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <div>
        <h2 className="text-lg font-medium">내 과목</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          학교 정보 등록 시 시간표에서 자동으로 채워집니다. 과목명을 바꾸면 학교
          시간표에도 수정한 이름이 표시됩니다. 스터디 플랜 추가 시 여기에 설정된
          과목만 선택할 수 있습니다. 색상 아이콘으로 과목별 표시 색을 바꿀 수
          있습니다. 교재명·공부방법 태그는{' '}
          <Link
            href="/dashboard/preferences/subject-tags"
            className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            설정 → 과목별 태그 설정
          </Link>
          에서 관리할 수 있습니다.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">과목 목록 불러오는 중...</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <ul className="space-y-2">
            {draftSubjects.map((subject, index) => (
              <li
                key={subject.id || `draft-${index}-${subject.label}`}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-neutral-700"
              >
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => moveSubject(index, -1)}
                    disabled={index === 0 || saving}
                    aria-label={`${subject.label} 위로 이동`}
                    className="rounded border border-gray-300 px-1.5 text-xs leading-none hover:bg-gray-50 disabled:opacity-40 dark:border-neutral-600 dark:hover:bg-zinc-800"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSubject(index, 1)}
                    disabled={index === draftSubjects.length - 1 || saving}
                    aria-label={`${subject.label} 아래로 이동`}
                    className="rounded border border-gray-300 px-1.5 text-xs leading-none hover:bg-gray-50 disabled:opacity-40 dark:border-neutral-600 dark:hover:bg-zinc-800"
                  >
                    ↓
                  </button>
                </div>

                <SubjectColorPicker
                  subjectId={subject.id}
                  category={subject.category}
                  color={subject.color}
                  subjects={draftSubjects}
                  disabled={saving}
                  onChange={(color) => updateSubjectColor(index, color)}
                />

                <input
                  type="text"
                  value={subject.label}
                  onChange={(event) => updateSubjectLabel(index, event.target.value)}
                  disabled={saving}
                  aria-label={`${subject.label || '과목'} 이름`}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-600 dark:bg-zinc-800"
                />

                <button
                  type="button"
                  onClick={() => removeSubject(index)}
                  disabled={draftSubjects.length <= 1 || saving}
                  className="shrink-0 rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSubjectLabel}
              onChange={(event) => setNewSubjectLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddSubject();
                }
              }}
              disabled={saving}
              placeholder="새 과목명"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-600 dark:bg-zinc-800"
            />
            <button
              type="button"
              onClick={handleAddSubject}
              disabled={saving || !newSubjectLabel.trim()}
              className="shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-zinc-800"
            >
              추가
            </button>
          </div>

          {(loadError || saveError) && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {saveError || loadError}
            </p>
          )}
          {saveSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">{saveSuccess}</p>
          )}

          <button
            type="submit"
            disabled={saving || loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '과목 설정 저장'}
          </button>
        </form>
      )}
    </section>
  );
}
