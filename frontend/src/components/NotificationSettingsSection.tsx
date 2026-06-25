'use client';

import { useEffect, useState } from 'react';
import {
  getPushSupportMessage,
  getPushSupportStatus,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  type PushSupportStatus,
} from '@/lib/push-notifications';

interface NotificationSettingsSectionProps {
  initialEnabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
}

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIosDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
}

export default function NotificationSettingsSection({
  initialEnabled = true,
  onEnabledChange,
}: NotificationSettingsSectionProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [support, setSupport] = useState<PushSupportStatus>('ready');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setEnabled(initialEnabled);
  }, [initialEnabled]);

  useEffect(() => {
    setSupport(getPushSupportStatus());
  }, []);

  const supportMessage = getPushSupportMessage(support);
  const showIosHint = isIosDevice() && !isStandalonePwa();

  async function persistEnabled(nextEnabled: boolean) {
    const res = await fetch('/api/profile/notifications', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: nextEnabled }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        typeof data.error === 'string' ? data.error : '알림 설정 저장에 실패했습니다.'
      );
    }

    const savedEnabled = data.notificationsEnabled === true;
    setEnabled(savedEnabled);
    onEnabledChange?.(savedEnabled);
  }

  async function handleToggle(nextEnabled: boolean) {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (nextEnabled) {
        const subscribeResult = await subscribeToPushNotifications();

        if (!subscribeResult.ok) {
          setError(subscribeResult.error ?? '알림 구독에 실패했습니다.');
          return;
        }

        await persistEnabled(true);
        setSuccess('학습 알림이 켜졌습니다.');
        return;
      }

      await unsubscribeFromPushNotifications();
      await persistEnabled(false);
      setSuccess('학습 알림이 꺼졌습니다.');
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : '알림 설정 변경에 실패했습니다.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <div>
        <h2 className="text-lg font-medium">학습 알림</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          계획한 TODO 시작 시각에 「[과목] 제목 — 학습할 시간입니다」 알림을 받습니다.
        </p>
      </div>

      {showIosHint && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          iOS에서는 Safari에서 「공유 → 홈 화면에 추가」 후 알림을 허용해야 합니다.
        </p>
      )}

      {supportMessage && (
        <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-zinc-800 dark:text-gray-200">
          {supportMessage}
        </p>
      )}

      <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3 dark:border-neutral-700">
        <div>
          <p className="text-sm font-medium">학습 알림 받기</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {enabled ? '켜짐' : '꺼짐'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={saving}
          onClick={() => handleToggle(!enabled)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-neutral-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
          <span className="sr-only">{enabled ? '알림 끄기' : '알림 켜기'}</span>
        </button>
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
      )}
    </section>
  );
}
