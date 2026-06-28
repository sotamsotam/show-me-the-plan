'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import PasswordInput from '@/components/PasswordInput';
import SignupConsentSection from '@/components/SignupConsentSection';
import SiteFooter from '@/components/SiteFooter';
import TurnstileWidget from '@/components/TurnstileWidget';
import {
  createSignupConsentsPayload,
  validateSignupConsentsClient,
} from '@/types/consent';
import {
  SCHOOL_LEVEL_OPTIONS,
  type AccountInfo,
  type SchoolLevel,
  type SchoolSearchResult,
  type SignupProfile,
  isNeisStudent,
  isOtherStudent,
} from '@/types/school';
import { getDefaultDashboardPathFromAccount } from '@/lib/account-helpers';
import { isTurnstileWidgetEnabled, TURNSTILE_VERIFICATION_FAILED_MESSAGE } from '@/lib/turnstile-client';
import { SERVICE_NAME } from '@/content/marketing/common';

const inputClassName =
  'w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10';

const submitButtonClassName =
  'w-full rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#2d5080] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(29,78,216,0.28)] transition-[transform,opacity,box-shadow] hover:shadow-[0_10px_28px_rgba(29,78,216,0.36)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50';

export default function SignupForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('middle');
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolResults, setSchoolResults] = useState<SchoolSearchResult[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolSearchResult | null>(
    null
  );
  const [grades, setGrades] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchingSchools, setSearchingSchools] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [guardianConsentConfirmed, setGuardianConsentConfirmed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const pendingAutoLoginRef = useRef<{ email: string; password: string } | null>(
    null
  );
  const turnstileRequired = isTurnstileWidgetEnabled();

  const isManagerSignup = schoolLevel === 'manager';
  const isOtherStudentSignup = isOtherStudent(schoolLevel);
  const isNeisStudentSignup = isNeisStudent(schoolLevel);
  const isSchoolSupported = SCHOOL_LEVEL_OPTIONS.some(
    (option) => option.value === schoolLevel && option.enabled
  );

  const resetSchoolSelection = useCallback(() => {
    setSchoolQuery('');
    setSchoolResults([]);
    setSelectedSchool(null);
    setGrades([]);
    setClasses([]);
    setGrade('');
    setClassName('');
  }, []);

  useEffect(() => {
    resetSchoolSelection();
  }, [schoolLevel, resetSchoolSelection]);

  useEffect(() => {
    if (!isNeisStudentSignup || schoolQuery.trim().length < 2) {
      setSchoolResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingSchools(true);
      try {
        const params = new URLSearchParams({
          schoolLevel,
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
  }, [schoolQuery, schoolLevel, isNeisStudentSignup]);

  async function loadGrades(school: SchoolSearchResult) {
    const params = new URLSearchParams({
      schoolLevel,
      atptOfcdcScCode: school.atptOfcdcScCode,
      sdSchulCode: school.sdSchulCode,
    });
    const res = await fetch(`/api/neis/classes?${params}`);
    const data = await res.json();

    if (res.ok) {
      setGrades(data.grades ?? []);
      setClasses([]);
      setGrade('');
      setClassName('');
    }
  }

  async function loadClasses(selectedGrade: string, school: SchoolSearchResult) {
    const params = new URLSearchParams({
      schoolLevel,
      atptOfcdcScCode: school.atptOfcdcScCode,
      sdSchulCode: school.sdSchulCode,
      grade: selectedGrade,
    });
    const res = await fetch(`/api/neis/classes?${params}`);
    const data = await res.json();

    if (res.ok) {
      setClasses(data.classes ?? []);
      setClassName('');
    }
  }

  function handleSelectSchool(school: SchoolSearchResult) {
    setSelectedSchool(school);
    setSchoolQuery(school.schulNm);
    setSchoolResults([]);
    loadGrades(school);
  }

  function handleGradeChange(value: string) {
    setGrade(value);
    if (selectedSchool && value) {
      loadClasses(value, selectedSchool);
    }
  }

  function handleTurnstileTokenChange(token: string | null) {
    setTurnstileToken(token);

    const pendingAutoLogin = pendingAutoLoginRef.current;
    if (pendingAutoLogin && token) {
      pendingAutoLoginRef.current = null;
      void completeAutoLogin(pendingAutoLogin.email, pendingAutoLogin.password, token);
    }
  }

  async function completeAutoLogin(
    loginEmail: string,
    loginPassword: string,
    token: string
  ) {
    const loginResult = await signIn('credentials', {
      identifier: loginEmail,
      password: loginPassword,
      turnstileToken: token,
      redirect: false,
    });

    setLoading(false);

    if (loginResult?.error) {
      router.push('/login?registered=true');
      return;
    }

    try {
      const profileRes = await fetch('/api/profile/me', { credentials: 'include' });
      const profileData = await profileRes.json();

      if (profileRes.ok) {
        const account: AccountInfo = {
          user: profileData.user ?? null,
          role: profileData.role ?? null,
          profile: profileData.profile ?? null,
        };

        router.push(getDefaultDashboardPathFromAccount(account));
        router.refresh();
        return;
      }
    } catch {
      // fallback below
    }

    router.push(isManagerSignup ? '/dashboard/pending' : '/dashboard/todo');
    router.refresh();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!isSchoolSupported) {
      setError('선택하신 회원 구분은 아직 지원하지 않습니다.');
      return;
    }

    const consents = createSignupConsentsPayload(
      termsAgreed,
      privacyAgreed,
      guardianConsentConfirmed
    );
    const consentError = validateSignupConsentsClient(consents);
    if (consentError) {
      setError(consentError);
      return;
    }

    let profile: SignupProfile;

    if (isManagerSignup) {
      profile = { schoolLevel: 'manager' };
    } else if (isOtherStudentSignup) {
      profile = { schoolLevel: 'other' };
    } else {
      if (!selectedSchool || !grade || !className) {
        setError('학교, 학년, 반을 모두 선택해 주세요.');
        return;
      }

      profile = {
        schoolLevel,
        atptOfcdcScCode: selectedSchool.atptOfcdcScCode,
        sdSchulCode: selectedSchool.sdSchulCode,
        schoolName: selectedSchool.schulNm,
        grade,
        className,
      };
    }

    if (turnstileRequired && !turnstileToken) {
      setError(TURNSTILE_VERIFICATION_FAILED_MESSAGE);
      return;
    }

    setLoading(true);

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        profile,
        consents,
        turnstileToken,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? '회원가입에 실패했습니다.');
      setTurnstileToken(null);
      turnstileRef.current?.reset();
      return;
    }

    if (turnstileRequired) {
      pendingAutoLoginRef.current = { email, password };
      setTurnstileToken(null);
      turnstileRef.current?.reset();
      return;
    }

    const loginResult = await signIn('credentials', {
      identifier: email,
      password,
      turnstileToken,
      redirect: false,
    });

    setLoading(false);

    if (loginResult?.error) {
      router.push('/login?registered=true');
      return;
    }

    try {
      const profileRes = await fetch('/api/profile/me', { credentials: 'include' });
      const profileData = await profileRes.json();

      if (profileRes.ok) {
        const account: AccountInfo = {
          user: profileData.user ?? null,
          role: profileData.role ?? null,
          profile: profileData.profile ?? null,
        };

        router.push(getDefaultDashboardPathFromAccount(account));
        router.refresh();
        return;
      }
    } catch {
      // fallback below
    }

    router.push(isManagerSignup ? '/dashboard/pending' : '/dashboard/todo');
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#092254]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,rgba(29,78,216,0.12),transparent_50%),radial-gradient(ellipse_at_80%_85%,rgba(45,80,128,0.15),transparent_45%)]"
      />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-lg animate-page-in">
          <Link href="/" className="mb-8 flex justify-center sm:mb-10">
            <img
              src="/logo/logo_wide_pc_blue.png"
              alt={SERVICE_NAME}
              className="h-16 w-auto object-contain"
            />
          </Link>

          <div className="rounded-2xl border border-white/10 bg-white p-7 shadow-[0_2px_8px_rgba(15,23,42,0.08),0_16px_48px_rgba(15,23,42,0.18)] sm:p-8">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                회원가입
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                14세 미만 학생의 경우 부모님 이메일을 사용해 주세요.
                <br />
                비밀번호 분실 시 이메일로 재설정되므로 실제 이메일을 사용해 주세요.
              </p>
            </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-gray-700">
              닉네임 (아이디 한글 3글자 영문 5자 이상)
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
              비밀번호 (최소 6자리 이상)
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-gray-700">회원 구분</span>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {SCHOOL_LEVEL_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors sm:w-auto sm:justify-start ${
                    option.value === 'manager' ? 'col-span-2 sm:col-span-1' : ''
                  } ${
                    schoolLevel === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-gray-50/80 text-gray-700 hover:border-gray-300'
                  } ${!option.enabled ? 'opacity-60' : ''}`}
                >
                  <input
                    type="radio"
                    name="schoolLevel"
                    value={option.value}
                    checked={schoolLevel === option.value}
                    onChange={() => setSchoolLevel(option.value)}
                    disabled={!option.enabled}
                    className="accent-blue-600"
                  />
                  {option.label}
                  {!option.enabled && (
                    <span className="text-xs text-gray-400">(준비 중)</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {isManagerSignup ? (
            <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              학생이 매니저로 승인한 이후부터 학생 학습 스케줄을 관리할 수 있습니다.
            </p>
          ) : isOtherStudentSignup ? (
            <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              재수생·자퇴생 등 학교에 다니지 않는 경우 선택해 주세요. 과목과 일정은
              직접 설정할 수 있습니다.
            </p>
          ) : isNeisStudentSignup ? (
            <>
              <div className="relative">
                <label htmlFor="school" className="mb-1.5 block text-sm font-medium text-gray-700">
                  학교 검색
                </label>
                <input
                  id="school"
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
                  className={inputClassName}
                />
                {searchingSchools && (
                  <p className="mt-1 text-xs text-gray-400">검색 중...</p>
                )}
                {schoolResults.length > 0 && !selectedSchool && (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                    {schoolResults.map((school) => (
                      <li key={`${school.atptOfcdcScCode}-${school.sdSchulCode}`}>
                        <button
                          type="button"
                          onClick={() => handleSelectSchool(school)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
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
                  <label htmlFor="grade" className="mb-1.5 block text-sm font-medium text-gray-700">
                    학년
                  </label>
                  <select
                    id="grade"
                    value={grade}
                    onChange={(e) => handleGradeChange(e.target.value)}
                    disabled={!selectedSchool || grades.length === 0}
                    required
                    className={`${inputClassName} disabled:opacity-50`}
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
                  <label htmlFor="className" className="mb-1.5 block text-sm font-medium text-gray-700">
                    반
                  </label>
                  <select
                    id="className"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    disabled={!grade || classes.length === 0}
                    required
                    className={`${inputClassName} disabled:opacity-50`}
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
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              선택하신 회원 구분은 아직 지원하지 않습니다.
            </p>
          )}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          <SignupConsentSection
            termsAgreed={termsAgreed}
            privacyAgreed={privacyAgreed}
            guardianConsentConfirmed={guardianConsentConfirmed}
            onTermsAgreedChange={setTermsAgreed}
            onPrivacyAgreedChange={setPrivacyAgreed}
            onGuardianConsentConfirmedChange={setGuardianConsentConfirmed}
          />

          <TurnstileWidget
            ref={turnstileRef}
            onTokenChange={handleTurnstileTokenChange}
            onError={() => setError(TURNSTILE_VERIFICATION_FAILED_MESSAGE)}
            className="flex justify-center"
          />

          <button
            type="submit"
            disabled={
              loading ||
              !isSchoolSupported ||
              (turnstileRequired && !turnstileToken)
            }
            className={submitButtonClassName}
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          이미 계정이 있으신가요?{' '}
          <Link
            href="/login"
            className="font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
          >
            로그인
          </Link>
        </p>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
            초·중·고 학생과 학부모(매니저)를 위한
            <br className="sm:hidden" />
            {' '}분량 중심 학습 계획·실행 관리 서비스
          </p>
        </div>
      </main>
      <SiteFooter tone="dark" />
    </div>
  );
}
