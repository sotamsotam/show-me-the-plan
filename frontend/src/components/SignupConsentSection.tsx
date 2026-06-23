'use client';

import Link from 'next/link';

type SignupConsentSectionProps = {
  termsAgreed: boolean;
  privacyAgreed: boolean;
  guardianConsentConfirmed: boolean;
  onTermsAgreedChange: (value: boolean) => void;
  onPrivacyAgreedChange: (value: boolean) => void;
  onGuardianConsentConfirmedChange: (value: boolean) => void;
};

export default function SignupConsentSection({
  termsAgreed,
  privacyAgreed,
  guardianConsentConfirmed,
  onTermsAgreedChange,
  onPrivacyAgreedChange,
  onGuardianConsentConfirmedChange,
}: SignupConsentSectionProps) {
  const allAgreed = termsAgreed && privacyAgreed && guardianConsentConfirmed;

  function handleAgreeAll(checked: boolean) {
    onTermsAgreedChange(checked);
    onPrivacyAgreedChange(checked);
    onGuardianConsentConfirmedChange(checked);
  }

  return (
    <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
      <legend className="px-1 text-sm font-medium text-gray-700">약관 및 개인정보 동의</legend>

      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={allAgreed}
          onChange={(e) => handleAgreeAll(e.target.checked)}
          className="mt-0.5 accent-blue-600"
        />
        <span className="font-medium">전체 동의</span>
      </label>

      <div className="space-y-2 border-t border-gray-200 pt-3">
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={termsAgreed}
            onChange={(e) => onTermsAgreedChange(e.target.checked)}
            className="mt-0.5 accent-blue-600"
          />
          <span>
            <span className="text-red-500">[필수]</span>{' '}
            <Link
              href="/legal/terms"
              target="_blank"
              className="text-blue-600 hover:underline"
            >
              이용약관
            </Link>
            에 동의합니다
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={privacyAgreed}
            onChange={(e) => onPrivacyAgreedChange(e.target.checked)}
            className="mt-0.5 accent-blue-600"
          />
          <span>
            <span className="text-red-500">[필수]</span>{' '}
            <Link
              href="/legal/privacy"
              target="_blank"
              className="text-blue-600 hover:underline"
            >
              개인정보 수집·이용
            </Link>
            에 동의합니다
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={guardianConsentConfirmed}
            onChange={(e) => onGuardianConsentConfirmedChange(e.target.checked)}
            className="mt-0.5 accent-blue-600"
          />
          <span>
            <span className="text-red-500">[필수]</span> 만 14세 이상이거나, 14세
            미만인 경우 법정대리인의 동의 하에 법정대리인 이메일로 가입함을
            확인합니다
          </span>
        </label>
      </div>
    </fieldset>
  );
}
