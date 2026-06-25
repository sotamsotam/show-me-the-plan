import type { Core } from '@strapi/strapi';
import webpush from 'web-push';

import { PUSH_SUBSCRIPTION_UID } from './push-notification-constants';
import { getVapidConfig } from './vapid-config';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  todoId?: number;
  occurrenceDate?: string;
}

export interface SendPushResult {
  sent: number;
  failed: number;
  removedSubscriptions: number;
}

function buildWebPushPayload(payload: PushPayload): string {
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/dashboard/todo',
    todoId: payload.todoId,
    occurrenceDate: payload.occurrenceDate,
  });
}

function isGoneSubscriptionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const statusCode = (error as { statusCode?: number }).statusCode;
  return statusCode === 404 || statusCode === 410;
}

export async function sendPushToUser(
  strapi: Core.Strapi,
  userId: number,
  payload: PushPayload
): Promise<SendPushResult> {
  const vapid = getVapidConfig();

  if (!vapid) {
    strapi.log.warn('[web-push] VAPID env not configured — skipping push send');
    return { sent: 0, failed: 0, removedSubscriptions: 0 };
  }

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const subscriptions = await strapi.db.query(PUSH_SUBSCRIPTION_UID).findMany({
    where: { user: userId },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, removedSubscriptions: 0 };
  }

  const message = buildWebPushPayload(payload);
  let sent = 0;
  let failed = 0;
  let removedSubscriptions = 0;

  for (const subscription of subscriptions) {
    const pushSubscription = {
      endpoint: String(subscription.endpoint),
      keys: {
        p256dh: String(subscription.p256dh),
        auth: String(subscription.auth),
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, message);
      sent += 1;
    } catch (error) {
      failed += 1;

      if (isGoneSubscriptionError(error)) {
        await strapi.db.query(PUSH_SUBSCRIPTION_UID).delete({
          where: { id: subscription.id },
        });
        removedSubscriptions += 1;
      } else {
        strapi.log.warn(
          `[web-push] send failed for user ${userId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  return { sent, failed, removedSubscriptions };
}

export async function isUserNotificationsEnabled(
  strapi: Core.Strapi,
  userId: number
): Promise<boolean> {
  const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
    where: { user: userId },
    select: ['notificationsEnabled'],
  });

  if (!profile) {
    return true;
  }

  return profile.notificationsEnabled !== false;
}
