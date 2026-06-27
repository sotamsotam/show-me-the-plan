const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type PushSupportStatus =
  | 'unsupported'
  | 'no-vapid'
  | 'insecure'
  | 'no-service-worker'
  | 'ready';

export interface PushSubscribeResult {
  ok: boolean;
  error?: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function getPushSupportStatus(): PushSupportStatus {
  if (typeof window === 'undefined') {
    return 'unsupported';
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }

  if (!window.isSecureContext) {
    return 'insecure';
  }

  if (!VAPID_PUBLIC_KEY) {
    return 'no-vapid';
  }

  return 'ready';
}

export function getPushSupportMessage(status: PushSupportStatus): string | null {
  switch (status) {
    case 'unsupported':
      return '이 브라우저는 웹 푸시 알림을 지원하지 않습니다.';
    case 'insecure':
      return '알림은 HTTPS 환경에서만 사용할 수 있습니다.';
    case 'no-vapid':
      return '알림 공개 키가 설정되지 않았습니다. (NEXT_PUBLIC_VAPID_PUBLIC_KEY)';
    case 'no-service-worker':
      return '앱 설치(PWA) 후 알림을 사용할 수 있습니다.';
    case 'ready':
      return null;
    default:
      return null;
  }
}

async function waitForServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const existing = await navigator.serviceWorker.getRegistration();

    if (existing) {
      return existing;
    }

    if (process.env.NODE_ENV === 'production') {
      return navigator.serviceWorker.ready;
    }

    return null;
  } catch {
    return null;
  }
}

export async function subscribeToPushNotifications(): Promise<PushSubscribeResult> {
  const support = getPushSupportStatus();

  if (support !== 'ready') {
    if (support === 'no-vapid') {
      return { ok: false, error: getPushSupportMessage(support) ?? '알림을 사용할 수 없습니다.' };
    }

    const registration = await waitForServiceWorkerRegistration();

    if (!registration) {
      return {
        ok: false,
        error:
          process.env.NODE_ENV === 'development'
            ? '개발 환경에서는 PWA가 비활성화되어 알림 구독을 테스트할 수 없습니다. 프로덕션 빌드 또는 HTTPS 배포 환경에서 시도해 주세요.'
            : (getPushSupportMessage('no-service-worker') ?? '알림을 사용할 수 없습니다.'),
      };
    }
  }

  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, error: getPushSupportMessage('no-vapid') ?? '알림을 사용할 수 없습니다.' };
  }

  let permission = Notification.permission;

  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return { ok: false, error: '알림 권한이 허용되지 않았습니다.' };
  }

  const registration = await waitForServiceWorkerRegistration();

  if (!registration) {
    return {
      ok: false,
      error:
        process.env.NODE_ENV === 'development'
          ? '개발 환경에서는 PWA가 비활성화되어 알림 구독을 테스트할 수 없습니다.'
          : '앱을 홈 화면에 추가한 뒤 다시 시도해 주세요.',
    };
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }));

  const json = subscription.toJSON();

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: '푸시 구독 정보를 읽을 수 없습니다.' };
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      ok: false,
      error: typeof data.error === 'string' ? data.error : '푸시 구독 등록에 실패했습니다.',
    };
  }

  return { ok: true };
}

export async function unsubscribeFromPushNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();

  if (!registration) {
    return;
  }

  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  const endpoint = subscription.endpoint;

  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });

  try {
    await subscription.unsubscribe();
  } catch {
    // Server-side subscription removal is enough for disable flow.
  }
}
