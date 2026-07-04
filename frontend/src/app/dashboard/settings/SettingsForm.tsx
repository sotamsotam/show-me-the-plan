'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import AccountDeletionSection from '@/components/AccountDeletionSection';
import NotificationSettingsSection from '@/components/NotificationSettingsSection';
import SubscriptionPointsSection from '@/components/billing/SubscriptionPointsSection';
import { getMarketingHomeUrl } from '@/lib/account-helpers';
import PasswordInput from '@/components/PasswordInput';
import { useProfileSubjectsContext } from '@/contexts/ProfileSubjectsContext';
import {
  SCHOOL_LEVEL_OPTIONS,
  SCHOOL_LEVEL_LABEL,
  type AccountInfo,
  type ManagerUser,
  type SchoolLevel,
  type SchoolSearchResult,
  isAnyStudent,
  isNeisStudent,
  isOtherStudent,
} from '@/types/school';

export default function SettingsForm() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [editableSchoolLevel, setEditableSchoolLevel] =
    useState<SchoolLevel>('middle');
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolResults, setSchoolResults] = useState<SchoolSearchResult[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolSearchResult | null>(
    null
  );
  const [grades, setGrades] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [searchingSchools, setSearchingSchools] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [managerQuery, setManagerQuery] = useState('');
  const [managerResults, setManagerResults] = useState<ManagerUser[]>([]);
  const [searchingManagers, setSearchingManagers] = useState(false);
  const [assignedManagers, setAssignedManagers] = useState<ManagerUser[]>([]);
  const [managerError, setManagerError] = useState('');
  const [managerSuccess, setManagerSuccess] = useState('');
  const [managerSaving, setManagerSaving] = useState(false);
  const [managerSearchAttempted, setManagerSearchAttempted] = useState(false);
  const { reload: reloadSubjects } = useProfileSubjectsContext();

  const profile = account?.profile;
  const isNeisStudentProfile = isNeisStudent(profile?.schoolLevel);
  const isOtherStudentProfile = isOtherStudent(profile?.schoolLevel);
  const isAnyStudentProfile = isAnyStudent(profile?.schoolLevel);
  const isManager = profile?.schoolLevel === 'manager';
  const studentSchoolLevel = isNeisStudent(editableSchoolLevel)
    ? editableSchoolLevel
    : null;

  const loadAccount = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile/me', { credentials: 'include' });
      const data = await res.json();

      if (!res.ok) {
        setAccount(null);
        return;
      }

      const nextAccount: AccountInfo = {
        user: data.user ?? null,
        role: data.role ?? null,
        profile: data.profile ?? null,
        subscription: data.subscription ?? null,
      };

      setAccount(nextAccount);

      if (data.user) {
        setUsername(data.user.username ?? '');
        setEmail(data.user.email ?? '');
      }

      if (data.profile && isAnyStudent(data.profile.schoolLevel)) {
        setAssignedManagers(data.profile.assignedManagers ?? []);
      }

      if (data.profile && isNeisStudent(data.profile.schoolLevel)) {
        setEditableSchoolLevel(data.profile.schoolLevel);
        setSchoolQuery(data.profile.schoolName ?? '');
        setGrade(data.profile.grade ?? '');
        setClassName(data.profile.className ?? '');

        if (data.profile.schoolName && data.profile.atptOfcdcScCode && data.profile.sdSchulCode) {
          setSelectedSchool({
            atptOfcdcScCode: data.profile.atptOfcdcScCode,
            atptOfcdcScNm: '',
            sdSchulCode: data.profile.sdSchulCode,
            schulNm: data.profile.schoolName,
            lctnScNm: '',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    if (!isNeisStudentProfile || !studentSchoolLevel || schoolQuery.trim().length < 2) {
      setSchoolResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingSchools(true);
      try {
        const params = new URLSearchParams({
          schoolLevel: studentSchoolLevel,
          q: schoolQuery.trim(),
        });
        const res = await fetch(`/api/neis/schools?${params}`);
        const data = await res.json();
        if (res.ok) {
          setSchoolResults(data.schools ?? []);
        }
      } finally {
        setSearchingSchools(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [schoolQuery, studentSchoolLevel, isNeisStudentProfile]);

  useEffect(() => {
    if (!isNeisStudentProfile || !selectedSchool || !studentSchoolLevel) {
      return;
    }

    async function loadGrades() {
      const params = new URLSearchParams({
        schoolLevel: studentSchoolLevel!,
        atptOfcdcScCode: selectedSchool!.atptOfcdcScCode,
        sdSchulCode: selectedSchool!.sdSchulCode,
      });
      const res = await fetch(`/api/neis/classes?${params}`);
      const data = await res.json();

      if (res.ok) {
        setGrades(data.grades ?? []);
      }
    }

    loadGrades();
  }, [isNeisStudentProfile, selectedSchool, studentSchoolLevel]);

  useEffect(() => {
    if (!isNeisStudentProfile || !selectedSchool || !grade || !studentSchoolLevel) {
      return;
    }

    async function loadClasses() {
      const params = new URLSearchParams({
        schoolLevel: studentSchoolLevel!,
        atptOfcdcScCode: selectedSchool!.atptOfcdcScCode,
        sdSchulCode: selectedSchool!.sdSchulCode,
        grade,
      });
      const res = await fetch(`/api/neis/classes?${params}`);
      const data = await res.json();

      if (res.ok) {
        setClasses(data.classes ?? []);
      }
    }

    loadClasses();
  }, [isNeisStudentProfile, selectedSchool, grade, studentSchoolLevel]);

  function handleSchoolLevelChange(level: SchoolLevel) {
    if (!isNeisStudent(level)) {
      return;
    }

    setEditableSchoolLevel(level);
    setSchoolQuery('');
    setSchoolResults([]);
    setSelectedSchool(null);
    setGrades([]);
    setClasses([]);
    setGrade('');
    setClassName('');
  }

  function handleSelectSchool(school: SchoolSearchResult) {
    setSelectedSchool(school);
    setSchoolQuery(school.schulNm);
    setSchoolResults([]);
    setGrade('');
    setClassName('');
    setClasses([]);
  }

  function handleGradeChange(value: string) {
    setGrade(value);
    setClassName('');
    setClasses([]);
  }

  async function handleAccountSubmit(e: FormEvent) {
    e.preventDefault();
    setAccountError('');
    setAccountSuccess('');

    if (isNeisStudentProfile && (!selectedSchool || !grade || !className)) {
      setAccountError('학교, 학년, 반을 모두 선택해 주세요.');
      return;
    }

    setAccountSaving(true);

    const body: {
      profile?: {
        schoolLevel: 'elementary' | 'middle' | 'high';
        atptOfcdcScCode: string;
        sdSchulCode: string;
        schoolName: string;
        grade: string;
        className: string;
      };
    } = {};

    if (isNeisStudentProfile && selectedSchool && studentSchoolLevel) {
      body.profile = {
        schoolLevel: studentSchoolLevel,
        atptOfcdcScCode: selectedSchool.atptOfcdcScCode,
        sdSchulCode: selectedSchool.sdSchulCode,
        schoolName: selectedSchool.schulNm,
        grade,
        className,
      };
    }

    const res = await fetch('/api/profile/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setAccountSaving(false);

    if (!res.ok) {
      setAccountError(data.error ?? '내정보 수정에 실패했습니다.');
      return;
    }

    setAccount({
      user: data.user ?? null,
      role: data.role ?? null,
      profile: data.profile ?? null,
    });

    if (data.profile && isNeisStudent(data.profile.schoolLevel)) {
      setEditableSchoolLevel(data.profile.schoolLevel);
    }

    setAccountSuccess('내정보가 저장되었습니다.');
    void reloadSubjects();
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('새 비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setPasswordSaving(true);

    const res = await fetch('/api/profile/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        currentPassword,
        password: newPassword,
      }),
    });

    const data = await res.json();
    setPasswordSaving(false);

    if (!res.ok) {
      setPasswordError(data.error ?? '비밀번호 변경에 실패했습니다.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccess('비밀번호가 변경되었습니다.');
  }

  async function handleManagerSearch() {
    setManagerError('');
    setManagerSuccess('');
    setManagerResults([]);
    setManagerSearchAttempted(false);

    const query = managerQuery.trim();

    if (query.length < 2) {
      setManagerError('검색어는 2자 이상 입력해 주세요.');
      return;
    }

    setSearchingManagers(true);

    try {
      const params = new URLSearchParams({ q: query });
      const res = await fetch(`/api/profile/managers/search?${params}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        setManagerError(data.error ?? '매니저 검색에 실패했습니다.');
        return;
      }

      setManagerResults(data.managers ?? []);
      setManagerSearchAttempted(true);
    } finally {
      setSearchingManagers(false);
    }
  }

  function applyManagerAccountResponse(data: {
    user?: AccountInfo['user'];
    role?: AccountInfo['role'];
    profile?: AccountInfo['profile'];
  }) {
    setAssignedManagers(data.profile?.assignedManagers ?? []);
    setAccount({
      user: data.user ?? null,
      role: data.role ?? null,
      profile: data.profile ?? null,
    });
  }

  async function handleAddManager(manager: ManagerUser) {
    setManagerError('');
    setManagerSuccess('');
    setManagerSaving(true);

    const res = await fetch('/api/profile/me/managers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ managerUserId: manager.id }),
    });

    const data = await res.json();
    setManagerSaving(false);

    if (!res.ok) {
      setManagerError(data.error ?? '매니저 추가에 실패했습니다.');
      return;
    }

    applyManagerAccountResponse(data);
    setManagerResults([]);
    setManagerQuery('');
    setManagerSearchAttempted(false);
    setManagerSuccess(`${manager.username} 매니저가 추가되었습니다.`);
  }

  async function handleRemoveManager(manager: ManagerUser) {
    setManagerError('');
    setManagerSuccess('');
    setManagerSaving(true);

    const res = await fetch(`/api/profile/me/managers/${manager.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await res.json();
    setManagerSaving(false);

    if (!res.ok) {
      setManagerError(data.error ?? '매니저 해제에 실패했습니다.');
      return;
    }

    applyManagerAccountResponse(data);
    setManagerSuccess(`${manager.username} 매니저가 해제되었습니다.`);
  }

  if (loading) {
    return (
      <main className="flex w-full flex-col items-center justify-center py-12">
        <p className="text-sm text-gray-300">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col py-8 md:py-12">
      <h1 className="mb-2 text-2xl font-semibold text-white">내정보 수정</h1>
      <p className="mb-8 text-sm text-gray-300">
        {isOtherStudentProfile
          ? '기타학생 계정입니다. 과목과 일정은 직접 설정해 주세요.'
          : '학교 정보를 수정할 수 있습니다. 사용자명과 이메일은 변경할 수 없습니다.'}
      </p>

      {isAnyStudentProfile ? (
        <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            구독 · 결제
          </p>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
            {account?.subscription?.isAccessAllowed
              ? `현재 이용 가능 (${account.subscription.status})`
              : '체험 또는 구독이 필요합니다.'}
          </p>
          {account?.subscription ? (
            <div className="mt-4">
              <SubscriptionPointsSection
                subscription={account.subscription}
                onUpdated={(subscription) =>
                  setAccount((current) =>
                    current ? { ...current, subscription } : current
                  )
                }
              />
            </div>
          ) : null}
          <Link
            href="/dashboard/settings/billing"
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] sm:w-auto"
          >
            구독신청·구독관리
          </Link>
        </div>
      ) : null}

      <form onSubmit={handleAccountSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">계정 정보</h2>

        {isManager && (
          <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
            회원 구분: 매니저
            {profile?.managerStatus === 'pending' && ' (승인 대기)'}
          </p>
        )}

        {isOtherStudentProfile && (
          <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
            회원 구분: {SCHOOL_LEVEL_LABEL.other}
            <span className="mt-1 block text-blue-700 dark:text-blue-300">
              학교에 재학 중이 아니므로 학교 시간표 연동을 사용하지 않습니다.
            </span>
          </p>
        )}

        <div>
          <label htmlFor="settings-username" className="mb-1 block text-sm font-medium">
            사용자명
          </label>
          <input
            id="settings-username"
            type="text"
            value={username}
            readOnly
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-neutral-700 dark:bg-zinc-800/50 dark:text-gray-400"
          />
        </div>

        <div>
          <label htmlFor="settings-email" className="mb-1 block text-sm font-medium">
            이메일
          </label>
          <input
            id="settings-email"
            type="email"
            value={email}
            readOnly
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-neutral-700 dark:bg-zinc-800/50 dark:text-gray-400"
          />
        </div>

        {isNeisStudentProfile && studentSchoolLevel && (
          <>
            <h3 className="pt-2 text-base font-medium">학교 정보</h3>

            <div>
              <span className="mb-2 block text-sm font-medium">학교 구분</span>
              <div className="flex flex-wrap gap-2">
                {SCHOOL_LEVEL_OPTIONS.filter((option) =>
                  isNeisStudent(option.value)
                ).map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                      editableSchoolLevel === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-300 dark:border-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="settingsSchoolLevel"
                      value={option.value}
                      checked={editableSchoolLevel === option.value}
                      onChange={() => handleSchoolLevelChange(option.value)}
                      className="accent-blue-600"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="relative">
              <label htmlFor="settings-school" className="mb-1 block text-sm font-medium">
                학교 검색
              </label>
              <input
                id="settings-school"
                type="text"
                value={schoolQuery}
                onChange={(e) => {
                  setSchoolQuery(e.target.value);
                  setSelectedSchool(null);
                  setGrades([]);
                  setClasses([]);
                  setGrade('');
                  setClassName('');
                }}
                placeholder="학교명을 입력하세요 (2자 이상)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
              />
              {searchingSchools && (
                <p className="mt-1 text-xs text-gray-400">검색 중...</p>
              )}
              {schoolResults.length > 0 && !selectedSchool && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-zinc-800">
                  {schoolResults.map((school) => (
                    <li key={`${school.atptOfcdcScCode}-${school.sdSchulCode}`}>
                      <button
                        type="button"
                        onClick={() => handleSelectSchool(school)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-700"
                      >
                        <span className="font-medium">{school.schulNm}</span>
                        <span className="ml-2 text-xs text-gray-400">
                          {school.lctnScNm}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="settings-grade" className="mb-1 block text-sm font-medium">
                  학년
                </label>
                <select
                  id="settings-grade"
                  value={grade}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  disabled={!selectedSchool || grades.length === 0}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-zinc-800"
                >
                  <option value="">선택</option>
                  {grades.map((g) => (
                    <option key={g} value={g}>
                      {g}학년
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="settings-class" className="mb-1 block text-sm font-medium">
                  반
                </label>
                <select
                  id="settings-class"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  disabled={!grade || classes.length === 0}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-zinc-800"
                >
                  <option value="">선택</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      {c}반
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {accountError && (
          <p className="text-sm text-red-600 dark:text-red-400">{accountError}</p>
        )}
        {accountSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400">{accountSuccess}</p>
        )}

        <button
          type="submit"
          disabled={accountSaving}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {accountSaving ? '저장 중...' : '내정보 저장'}
        </button>
      </form>

      <form
        onSubmit={handlePasswordSubmit}
        className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900"
      >
        <h2 className="text-lg font-medium">비밀번호 변경</h2>

        <div>
          <label htmlFor="current-password" className="mb-1 block text-sm font-medium">
            현재 비밀번호
          </label>
          <PasswordInput
            id="current-password"
            value={currentPassword}
            onChange={setCurrentPassword}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
          />
        </div>

        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-medium">
            새 비밀번호
          </label>
          <PasswordInput
            id="new-password"
            value={newPassword}
            onChange={setNewPassword}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium">
            새 비밀번호 확인
          </label>
          <PasswordInput
            id="confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
          />
        </div>

        {passwordError && (
          <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
        )}
        {passwordSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400">{passwordSuccess}</p>
        )}

        <button
          type="submit"
          disabled={passwordSaving}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-zinc-800"
        >
          {passwordSaving ? '변경 중...' : '비밀번호 변경'}
        </button>
      </form>

      {isAnyStudentProfile && (
        <NotificationSettingsSection
          initialEnabled={profile?.notificationsEnabled !== false}
        />
      )}

      {isAnyStudentProfile && (
        <section className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
          <h2 className="text-lg font-medium">매니저 설정</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            담당 매니저를 검색하여 추가할 수 있습니다. 복수 지정이 가능하며, 개별
            해제도 할 수 있습니다.
          </p>

          {assignedManagers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">현재 담당 매니저</p>
              <ul className="space-y-2">
                {assignedManagers.map((manager) => (
                  <li
                    key={manager.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm dark:bg-blue-950"
                  >
                    <div className="min-w-0 text-blue-800 dark:text-blue-200">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        {manager.username}
                      </p>
                      <p className="truncate text-xs">{manager.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveManager(manager)}
                      disabled={managerSaving}
                      className="shrink-0 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900"
                    >
                      해제
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              설정된 매니저가 없습니다.
            </p>
          )}

          <div>
            <label htmlFor="manager-search" className="mb-1 block text-sm font-medium">
              매니저 검색
            </label>
            <div className="flex gap-2">
              <input
                id="manager-search"
                type="text"
                value={managerQuery}
                onChange={(e) => {
                  setManagerQuery(e.target.value);
                  setManagerResults([]);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManagerSearch();
                  }
                }}
                placeholder="이름 또는 이메일 (2자 이상)"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={handleManagerSearch}
                disabled={searchingManagers || managerSaving}
                className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {searchingManagers ? '검색 중...' : '검색'}
              </button>
            </div>
          </div>

          {managerResults.length > 0 && (
            <ul className="max-h-48 overflow-auto rounded-lg border border-gray-200 dark:border-neutral-700">
              {managerResults.map((manager) => (
                <li
                  key={manager.id}
                  className="border-b border-gray-100 last:border-b-0 dark:border-neutral-800"
                >
                  <button
                    type="button"
                    onClick={() => handleAddManager(manager)}
                    disabled={
                      managerSaving ||
                      assignedManagers.some((assigned) => assigned.id === manager.id)
                    }
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-zinc-800"
                  >
                    <span>
                      <span className="font-medium">{manager.username}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        {manager.email}
                      </span>
                    </span>
                    {assignedManagers.some((assigned) => assigned.id === manager.id) ? (
                      <span className="text-xs text-blue-600">이미 지정됨</span>
                    ) : (
                      <span className="text-xs text-gray-400">추가</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {managerSearchAttempted && managerResults.length === 0 && !searchingManagers && (
            <p className="text-xs text-gray-400">검색 결과가 없습니다.</p>
          )}

          {managerError && (
            <p className="text-sm text-red-600 dark:text-red-400">{managerError}</p>
          )}
          {managerSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">{managerSuccess}</p>
          )}
        </section>
      )}

      <AccountDeletionSection />

      <p className="mt-8 text-center text-xs text-gray-400">
        <Link
          href={getMarketingHomeUrl()}
          className="hover:text-gray-600 dark:hover:text-gray-300"
        >
          서비스 소개
        </Link>
        {' · '}
        <Link href="/legal/privacy" className="hover:text-gray-600 dark:hover:text-gray-300">
          개인정보 처리방침
        </Link>
        {' · '}
        <Link href="/legal/terms" className="hover:text-gray-600 dark:hover:text-gray-300">
          이용약관
        </Link>
        {' · '}
        <Link
          href="/legal/paid-service"
          className="hover:text-gray-600 dark:hover:text-gray-300"
        >
          유료서비스 약관
        </Link>
      </p>
    </main>
  );
}
