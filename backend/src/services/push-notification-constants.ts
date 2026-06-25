export const NOTIFICATION_UID = 'api::notification.notification' as const;
export const PUSH_SUBSCRIPTION_UID = 'api::push-subscription.push-subscription' as const;

export const NOTIFICATION_SKIP_REASONS = [
  'completed',
  'cancelled',
  'suppressed',
  'expired',
] as const;

export type NotificationSkipReason = (typeof NOTIFICATION_SKIP_REASONS)[number];

export const PUSH_TIMEZONE = 'Asia/Seoul' as const;
