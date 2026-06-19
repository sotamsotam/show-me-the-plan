'use client';

import { useEffect, useState } from 'react';

/** Tailwind `md` breakpoint — mobile nav & overlays use this. */
export const MOBILE_NAV_MEDIA_QUERY = '(max-width: 767px)';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_NAV_MEDIA_QUERY);
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);

    return () => {
      mediaQuery.removeEventListener('change', update);
    };
  }, []);

  return isMobile;
}
