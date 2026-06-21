type BillingLogLevel = 'info' | 'warn' | 'error';

type BillingLogPayload = Record<string, unknown>;

export function logBillingEvent(
  level: BillingLogLevel,
  event: string,
  payload?: BillingLogPayload
) {
  const entry = {
    scope: 'billing',
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  const message = `[billing] ${event}`;

  if (level === 'error') {
    console.error(message, entry);
    return;
  }

  if (level === 'warn') {
    console.warn(message, entry);
    return;
  }

  console.info(message, entry);
}
