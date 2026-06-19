'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'pwa-install-hint-dismissed';
const DISMISS_DAYS = 7;

type InstallPlatform = 'ios' | 'android';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIosSafari(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true)
  );
}

function isDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) {
    return false;
  }

  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) {
    return false;
  }

  const elapsedMs = Date.now() - dismissedAt;
  return elapsedMs < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function dismissHint() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

export default function PwaInstallHint() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>('ios');
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  const hasBottomNav =
    pathname?.startsWith('/dashboard') && pathname !== '/dashboard/pending';

  useEffect(() => {
    if (isStandalone() || isDismissed()) {
      return;
    }

    if (isIosSafari()) {
      setPlatform('ios');
      setVisible(true);
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setPlatform('android');
      setVisible(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    setInstalling(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        dismissHint();
        setVisible(false);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    dismissHint();
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-x-0 z-[60] border-t border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-lg dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100 ${
        hasBottomNav
          ? 'bottom-[calc(3.5rem+env(safe-area-inset-bottom))]'
          : 'bottom-0 pb-[env(safe-area-inset-bottom)]'
      }`}
    >
      <div className="mx-auto flex max-w-lg items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {platform === 'ios' ? (
            <p>
              앱처럼 사용하려면 Safari 공유 버튼을 누른 뒤{' '}
              <strong>홈 화면에 추가</strong>를 선택하세요.
            </p>
          ) : (
            <p>
              Show Me The Plan을 홈 화면에 설치하면 앱처럼 더 편하게 사용할 수
              있습니다.
            </p>
          )}
          {platform === 'android' && (
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing || !deferredPrompt}
              className="touch-press mt-2 min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {installing ? '설치 중...' : '앱 설치'}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="touch-press shrink-0 rounded px-3 py-2 text-blue-700 hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-900"
          aria-label="안내 닫기"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
