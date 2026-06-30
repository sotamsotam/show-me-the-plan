'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import TagInput from '@/components/TagInput';
import { useManagerStudent } from '@/contexts/ManagerStudentContext';
import { useProfileSubjectsContext } from '@/contexts/ProfileSubjectsContext';
import { publishProfileSubjects } from '@/lib/profile-subjects-store';
import type { UserSubject } from '@/lib/user-subject';

function cloneSubjects(subjects: UserSubject[]): UserSubject[] {
  return subjects.map((subject) => ({
    ...subject,
    textbooks: subject.textbooks ? [...subject.textbooks] : undefined,
    studyMethods: subject.studyMethods ? [...subject.studyMethods] : undefined,
  }));
}

function applySubjectTagsUpdate(
  subjects: UserSubject[],
  index: number,
  field: 'textbooks' | 'studyMethods',
  tags: string[]
): UserSubject[] {
  return subjects.map((subject, subjectIndex) => {
    if (subjectIndex !== index) {
      return subject;
    }

    const next = { ...subject };

    if (tags.length === 0) {
      delete next[field];
    } else {
      next[field] = tags;
    }

    return next;
  });
}

export default function SubjectTagPresetsSection() {
  const { isManagerMode, selectedStudentId } = useManagerStudent();
  const studentUserId = isManagerMode ? selectedStudentId : null;
  const { subjects, loading, error: loadError, reload } = useProfileSubjectsContext();
  const [draftSubjects, setDraftSubjects] = useState<UserSubject[]>([]);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftSubjects(cloneSubjects(subjects));
  }, [subjects]);

  async function persistSubjects(nextSubjects: UserSubject[]) {
    setSaveError('');
    setSaveSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/profile/subjects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subjects: nextSubjects }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error ?? '태그 설정 저장에 실패했습니다.');
        await reload();
        return;
      }

      const savedSubjects = data.subjects ?? nextSubjects;
      setDraftSubjects(cloneSubjects(savedSubjects));
      setSaveSuccess('저장되었습니다.');
      publishProfileSubjects(studentUserId, savedSubjects);
    } catch {
      setSaveError('태그 설정 저장에 실패했습니다.');
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleSubjectTagsChange(
    index: number,
    field: 'textbooks' | 'studyMethods',
    tags: string[]
  ) {
    const nextSubjects = applySubjectTagsUpdate(draftSubjects, index, field, tags);
    setDraftSubjects(nextSubjects);
    await persistSubjects(nextSubjects);
  }

  return (
    <section className="weekly-plan-settings-page w-full space-y-4">
      <div className="shrink-0">
        <h2 className="text-lg font-medium text-white">과목별 태그 설정</h2>
        <p className="mt-1 text-sm text-[#e2feff]">
          과목별 교재명·공부방법을 등록하면 스터디 플랜 추가 시 제목을 빠르게
          작성할 수 있습니다. 태그는 추가·삭제 시 자동으로 저장됩니다. 과목
          추가·삭제는{' '}
          <Link
            href="/dashboard/settings"
            className="text-yellow-400 underline-offset-2 hover:underline hover:text-yellow-300"
          >
            내정보 수정
          </Link>
          에서 할 수 있습니다.
        </p>
      </div>

      {loading && draftSubjects.length === 0 ? (
        <p className="text-sm text-gray-500">과목 목록 불러오는 중...</p>
      ) : draftSubjects.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-neutral-800 dark:bg-zinc-900 dark:text-gray-400">
          등록된 과목이 없습니다.{' '}
          <Link
            href="/dashboard/settings"
            className="text-yellow-400 underline-offset-2 hover:underline hover:text-yellow-300"
          >
            내정보 수정
          </Link>
          에서 학교 정보를 등록하거나 과목을 추가해 주세요.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
            {draftSubjects.map((subject, index) => (
              <li
                key={subject.id || `tag-${index}-${subject.label}`}
                className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900"
              >
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {subject.label}
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <TagInput
                    id={`tag-${index}-textbooks`}
                    label="교재명"
                    tags={subject.textbooks ?? []}
                    onChange={(tags) => handleSubjectTagsChange(index, 'textbooks', tags)}
                    placeholder="예: 교과서, 프린트, 참고서 등"
                    disabled={saving}
                  />
                  <TagInput
                    id={`tag-${index}-study-methods`}
                    label="공부방법"
                    tags={subject.studyMethods ?? []}
                    onChange={(tags) => handleSubjectTagsChange(index, 'studyMethods', tags)}
                    placeholder="예: 인강듣기, 문제풀기, 단권화하기 등"
                    disabled={saving}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="shrink-0 space-y-2">
            {(loadError || saveError) && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {saveError || loadError}
              </p>
            )}
            {saving && (
              <p className="text-sm text-gray-500 dark:text-gray-400">저장 중...</p>
            )}
            {!saving && saveSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">{saveSuccess}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
