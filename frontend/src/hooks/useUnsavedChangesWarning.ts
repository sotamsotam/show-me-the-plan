'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

function shouldConfirmNavigation(anchor: HTMLAnchorElement, pathname: string): boolean {
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
    return false;
  }

  const rawHref = anchor.getAttribute('href');
  if (
    !rawHref ||
    rawHref.startsWith('#') ||
    rawHref.startsWith('mailto:') ||
    rawHref.startsWith('tel:')
  ) {
    return false;
  }

  const url = new URL(rawHref, window.location.origin);
  if (url.origin !== window.location.origin) {
    return true;
  }

  const currentUrl = `${pathname}${window.location.search}${window.location.hash}`;
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  return currentUrl !== nextUrl;
}

export function useUnsavedChangesWarning(isDirty: boolean, message: string) {
  const pathname = usePathname();

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (!shouldConfirmNavigation(anchor, pathname)) {
        return;
      }

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClick, true);

    const pushHistoryGuard = () => {
      window.history.pushState({ unsavedChangesGuard: true }, '', window.location.href);
    };

    pushHistoryGuard();

    const handlePopState = () => {
      if (!window.confirm(message)) {
        pushHistoryGuard();
        return;
      }

      window.removeEventListener('popstate', handlePopState);
      window.history.back();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDirty, message, pathname]);
}
