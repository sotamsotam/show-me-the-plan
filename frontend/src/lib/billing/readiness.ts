export type BillingReadinessCheck = {
  id: string;
  ok: boolean;
  severity: 'error' | 'warn';
  message: string;
};

export function getBillingReadinessChecks(
  env: NodeJS.ProcessEnv = process.env
): BillingReadinessCheck[] {
  const isProduction = env.NODE_ENV === 'production';
  const webhookSkipVerify = env.PORTONE_WEBHOOK_SKIP_VERIFY === 'true';
  const hasInternalSecret = Boolean(env.BILLING_INTERNAL_SECRET?.trim());
  const hasCronSecret = Boolean(env.BILLING_CRON_SECRET?.trim());
  const hasEncryptionKey = Boolean(env.BILLING_ENCRYPTION_KEY?.trim());
  const portoneReady = Boolean(
    env.PORTONE_API_SECRET?.trim() &&
      env.NEXT_PUBLIC_PORTONE_STORE_ID?.trim() &&
      env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY?.trim()
  );
  const hasWebhookSecret = Boolean(env.PORTONE_WEBHOOK_SECRET?.trim());

  return [
    {
      id: 'portone_keys',
      ok: portoneReady,
      severity: 'error',
      message: portoneReady
        ? '포트원 API·스토어·채널 키가 설정되어 있습니다.'
        : 'PORTONE_API_SECRET, NEXT_PUBLIC_PORTONE_STORE_ID, NEXT_PUBLIC_PORTONE_CHANNEL_KEY 중 누락이 있습니다.',
    },
    {
      id: 'billing_internal_secret',
      ok: hasInternalSecret,
      severity: 'error',
      message: hasInternalSecret
        ? 'BILLING_INTERNAL_SECRET이 설정되어 있습니다.'
        : 'BILLING_INTERNAL_SECRET이 없습니다.',
    },
    {
      id: 'billing_cron_secret',
      ok: hasCronSecret,
      severity: isProduction ? 'error' : 'warn',
      message: hasCronSecret
        ? 'BILLING_CRON_SECRET이 설정되어 있습니다.'
        : 'BILLING_CRON_SECRET이 없습니다. 갱신 cron을 호출할 수 없습니다.',
    },
    {
      id: 'billing_encryption_key',
      ok: hasEncryptionKey,
      severity: isProduction ? 'error' : 'warn',
      message: hasEncryptionKey
        ? 'BILLING_ENCRYPTION_KEY가 설정되어 있습니다.'
        : 'BILLING_ENCRYPTION_KEY가 없습니다. 빌링키 암호화가 비활성화됩니다.',
    },
    {
      id: 'webhook_secret',
      ok: webhookSkipVerify || hasWebhookSecret,
      severity: isProduction && !webhookSkipVerify && !hasWebhookSecret ? 'error' : 'warn',
      message:
        webhookSkipVerify
          ? '개발 환경: Webhook 서명 검증이 비활성화되어 있습니다.'
          : hasWebhookSecret
            ? 'PORTONE_WEBHOOK_SECRET이 설정되어 있습니다.'
            : 'PORTONE_WEBHOOK_SECRET이 없습니다.',
    },
    {
      id: 'webhook_signature',
      ok: !isProduction || !webhookSkipVerify,
      severity: isProduction && webhookSkipVerify ? 'error' : 'warn',
      message:
        isProduction && webhookSkipVerify
          ? '운영 환경에서 PORTONE_WEBHOOK_SKIP_VERIFY=true 입니다. false로 변경하세요.'
          : webhookSkipVerify
            ? '개발 환경: Webhook 서명 검증이 비활성화되어 있습니다.'
            : 'Webhook 서명 검증이 활성화되어 있습니다.',
    },
    {
      id: 'nextauth_url',
      ok: Boolean(env.NEXTAUTH_URL?.trim()),
      severity: 'error',
      message: env.NEXTAUTH_URL?.trim()
        ? `NEXTAUTH_URL=${env.NEXTAUTH_URL.trim()}`
        : 'NEXTAUTH_URL이 없습니다.',
    },
  ];
}

export function summarizeBillingReadiness(checks: BillingReadinessCheck[]) {
  const errors = checks.filter((check) => !check.ok && check.severity === 'error');
  const warnings = checks.filter((check) => !check.ok && check.severity === 'warn');

  return {
    ready: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length,
    checks,
  };
}
