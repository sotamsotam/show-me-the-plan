'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import PasswordInput from '@/components/PasswordInput';
import SignupConsentSection from '@/components/SignupConsentSection';
import SiteFooter from '@/components/SiteFooter';
import {
  createSignupConsentsPayload,
  validateSignupConsentsClient,
} from '@/types/consent';
import {
  SCHOOL_LEVEL_OPTIONS,
  type SchoolLevel,
  type SchoolSearchResult,
  type SignupProfile,
  isNeisStudent,
  isOtherStudent,
} from '@/types/school';

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

    setLoading(true);

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, profile, consents }),
    });

    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? '회원가입에 실패했습니다.');
      return;
    }

    const loginResult = await signIn('credentials', {
      identifier: email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (loginResult?.error) {
      router.push('/login?registered=true');
      return;
    }

    if (isManagerSignup) {
      router.push('/dashboard/students');
      router.refresh();
      return;
    }

    router.push('/dashboard/todo');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-2xl font-semibold">회원가입</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          14세 미만 학생의 경우 부모님 이메일을 사용해 주세요<br /> (비밀번호 분실시 이메일로 재설정되므로 실제 이메일을 사용해주세요)
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium">
              닉네임
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              비밀번호 (최소6자리이상)
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
            />
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium">회원 구분</span>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {SCHOOL_LEVEL_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm sm:w-auto sm:justify-start ${
                    option.value === 'manager' ? 'col-span-2 sm:col-span-1' : ''
                  } ${
                    schoolLevel === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-300 dark:border-neutral-700'
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
            <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
              학생이 매니저로 승인 한 이후 부터 학생 학습스케쥴을 관리할 수 있습니다
            </p>
          ) : isOtherStudentSignup ? (
            <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
              재수생·자퇴생 등 학교에 다니지 않는 경우 선택해 주세요. 과목과 일정은
              직접 설정할 수 있습니다.
            </p>
          ) : isNeisStudentSignup ? (
            <>
              <div className="relative">
                <label htmlFor="school" className="mb-1 block text-sm font-medium">
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
                  <label htmlFor="grade" className="mb-1 block text-sm font-medium">
                    학년
                  </label>
                  <select
                    id="grade"
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
                  <label htmlFor="className" className="mb-1 block text-sm font-medium">
                    반
                  </label>
                  <select
                    id="className"
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
          ) : (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              선택하신 회원 구분은 아직 지원하지 않습니다.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <SignupConsentSection
            termsAgreed={termsAgreed}
            privacyAgreed={privacyAgreed}
            guardianConsentConfirmed={guardianConsentConfirmed}
            onTermsAgreedChange={setTermsAgreed}
            onPrivacyAgreedChange={setPrivacyAgreed}
            onGuardianConsentConfirmedChange={setGuardianConsentConfirmed}
          />

          <button
            type="submit"
            disabled={loading || !isSchoolSupported}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            로그인
          </Link>
        </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
