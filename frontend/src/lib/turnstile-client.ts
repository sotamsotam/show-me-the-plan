export const TURNSTILE_VERIFICATION_FAILED_MESSAGE =
  '보안 확인에 실패했습니다. 새로고침 후 다시 시도해 주세요.';

export function isTurnstileWidgetEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
}
