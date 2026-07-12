'use client';

import ResponsiveOverlay from '@/components/ResponsiveOverlay';
import { triggerHaptic } from '@/lib/haptic';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'pwa-install-hint-dismissed';
const DISMISS_DAYS = 7;
const TOOLTIP_MS = 5000;

type InstallPlatform = 'ios' | 'android' | 'android-samsung';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIos(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isSamsungInternet(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return /SamsungBrowser/i.test(window.navigator.userAgent);
}

function openInChrome() {
  const { host, pathname, search, hash } = window.location;
  const fallbackUrl = encodeURIComponent(window.location.href);
  const intentUrl = `intent://${host}${pathname}${search}${hash}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallbackUrl};end`;

  window.location.href = intentUrl;
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

function fabBottomClass(hasBottomNav: boolean) {
  return hasBottomNav
    ? 'bottom-[calc(3.5rem+1rem+env(safe-area-inset-bottom))]'
    : 'bottom-[calc(1rem+env(safe-area-inset-bottom))]';
}

function InstallFabIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
      aria-hidden
    >
      <path
        d="M12 16V4m0 12-4-4m4 4 4-4M5 20h14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PwaInstallHint() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>('ios');
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const hasBottomNav =
    pathname?.startsWith('/dashboard') && pathname !== '/dashboard/pending';

  useEffect(() => {
    if (isStandalone() || isDismissed()) {
      return;
    }

    if (isIos()) {
      setPlatform('ios');
      setVisible(true);
      setShowTooltip(true);
      return;
    }

    if (isSamsungInternet()) {
      setPlatform('android-samsung');
      setVisible(true);
      setShowTooltip(true);
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setPlatform('android');
      setVisible(true);
      setShowTooltip(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!showTooltip) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowTooltip(false);
    }, TOOLTIP_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [showTooltip]);

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

  function handleFabClick() {
    triggerHaptic('light');
    setShowTooltip(false);

    if (platform === 'android') {
      void handleInstall();
      return;
    }

    setSheetOpen(true);
  }

  function handleDismiss() {
    dismissHint();
    setSheetOpen(false);
    setVisible(false);
  }

  function handleSheetClose() {
    setSheetOpen(false);
  }

  if (!visible) {
    return null;
  }

  const bottomClass = fabBottomClass(hasBottomNav);

  return (
    <>
      <div
        className={`fixed left-4 z-50 md:hidden ${bottomClass}`}
      >
        {showTooltip && (
          <div
            className="pointer-events-none absolute bottom-full left-0 mb-2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-md dark:bg-gray-100 dark:text-gray-900"
            role="tooltip"
          >
            앱 설치
          </div>
        )}
        <button
          type="button"
          onClick={handleFabClick}
          disabled={installing}
          aria-label="앱 설치"
          className="touch-press relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-blue-600 bg-white text-blue-600 shadow-lg shadow-blue-600/20 ring-2 ring-blue-400/30 hover:bg-blue-50 disabled:opacity-60 dark:bg-zinc-900 dark:text-blue-400 dark:hover:bg-zinc-800"
        >
          <InstallFabIcon />
        </button>
      </div>

      <ResponsiveOverlay
        open={sheetOpen}
        onClose={handleSheetClose}
        title="앱 설치"
        mobileVariant="sheet"
      >
        {platform === 'ios' && (
          <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <p>
              쇼미플을 홈 화면에 추가하면 앱처럼 더 편하게 사용할 수 있습니다.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                브라우저 하단의 <strong>공유</strong> 버튼을 누릅니다.
              </li>
              <li>
                <strong>홈 화면에 추가</strong>를 선택합니다.
              </li>
            </ol>
          </div>
        )}

        {platform === 'android-samsung' && (
          <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <p>
              일부 브라우저(삼성 브라우저)에서 앱 설치 시 보안 경고가 뜰 수
              있습니다. 쇼미플은 안전하니 <strong>무시하고 설치</strong>를
              누르시거나, <strong>Chrome</strong>에서 접속한 뒤 설치하면 경고
              없이 설치됩니다.
            </p>
            <button
              type="button"
              onClick={openInChrome}
              className="touch-press min-h-11 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Chrome에서 열기
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="touch-press mt-4 w-full rounded-lg px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-zinc-800"
        >
          다시 안 보기
        </button>
      </ResponsiveOverlay>
    </>
  );
}
